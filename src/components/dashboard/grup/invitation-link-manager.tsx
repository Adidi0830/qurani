"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Link,
  Plus,
  Calendar,
  Trash2,
  Share2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateInvitationLink,
  getGroupInvitationLinks,
  deleteInvitationLink,
} from "@/utils/api/grup/invitation-links";

interface InvitationLinkManagerProps {
  groupId: string;
  groupName: string;
}

interface InvitationLinkData {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
  url: string;
}

export function InvitationLinkManager({ groupId, groupName }: InvitationLinkManagerProps) {
  const [links, setLinks] = useState<InvitationLinkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state for creating new link
  const [expiresIn, setExpiresIn] = useState("72"); // hours

  const loadInvitationLinks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getGroupInvitationLinks(groupId);

      if (result.status === "success" && result.data) {
        setLinks(result.data);
      } else {
        toast.error(result.message || "Gagal memuat link undangan");
      }
    } catch (error) {
      console.error("Error loading invitation links:", error);
      toast.error("Terjadi kesalahan saat memuat link undangan");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadInvitationLinks();
  }, [loadInvitationLinks]);

  const handleGenerateLink = async () => {
    try {
      setIsGenerating(true);
      const result = await generateInvitationLink(
        groupId,
        parseInt(expiresIn)
      );

      if (result.status === "success") {
        toast.success("Link undangan berhasil dibuat!");
        setIsCreateModalOpen(false);
        setExpiresIn("72");
        await loadInvitationLinks();
      } else {
        toast.error(result.message || "Gagal membuat link undangan");
      }
    } catch (error) {
      console.error("Error generating link:", error);
      toast.error("Terjadi kesalahan saat membuat link undangan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const result = await deleteInvitationLink(linkId);

      if (result.status === "success") {
        toast.success("Link berhasil dihapus");
        await loadInvitationLinks();
      } else {
        toast.error(result.message || "Gagal menghapus link");
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Terjadi kesalahan saat menghapus link");
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Link berhasil disalin ke clipboard!");
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const shareLink = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bergabung ke grup ${groupName}`,
          text: `Anda diundang untuk bergabung ke grup ${groupName}`,
          url: url,
        });
      } catch {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  // Format expiry date - Indonesian format (DD MMM YYYY, HH:MM)
  const formatExpiryDate = (dateString: string) => {
    const dt = new Date(dateString);
    if (Number.isNaN(dt.getTime())) return dateString;
    const day = dt.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const month = months[dt.getMonth()];
    const year = dt.getFullYear();
    const jam = dt.toLocaleTimeString('id-ID', {
      hour: "2-digit",
      minute: "2-digit"
    });
    return `${day} ${month} ${year}, ${jam}`;
  };

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  const getTimeLeft = (dateString: string) => {
    const now = new Date();
    const expiry = new Date(dateString);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Kedaluwarsa";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} hari lagi`;
    if (hours > 0) return `${hours} jam lagi`;
    return "Kurang dari 1 jam lagi";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Link Undangan Grup</h3>
          <p className="text-sm text-muted-foreground">
            Kelola link undangan untuk {groupName}
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Link Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Link Undangan Baru</DialogTitle>
              <DialogDescription>
                Buat link undangan baru untuk grup {groupName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expires-in">Berlaku Selama</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih durasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Jam</SelectItem>
                    <SelectItem value="72">3 Hari</SelectItem>
                    <SelectItem value="168">1 Minggu</SelectItem>
                    <SelectItem value="720">30 Hari</SelectItem>
                    <SelectItem value="8760">1 Tahun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setExpiresIn("72");
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Buat Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Memuat link undangan...</p>
        </div>
      ) : links.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Link className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Belum Ada Link Undangan</h3>
            <p className="text-muted-foreground mb-4">
              Buat link undangan pertama untuk berbagi grup ini dengan orang lain
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Link Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <Card key={link.id} className={isExpired(link.expires_at) ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Link URL */}
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        value={link.url}
                        readOnly
                        className="text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(link.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareLink(link.url)}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Link Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {isExpired(link.expires_at) ? (
                            <span className="text-destructive">Kedaluwarsa</span>
                          ) : (
                            getTimeLeft(link.expires_at)
                          )}
                        </span>
                      </div>

                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mt-3">
                      {isExpired(link.expires_at) ? (
                        <Badge variant="destructive">Kedaluwarsa</Badge>
                      ) : (
                        <Badge variant="default">Aktif</Badge>
                      )}

                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                      Dibuat: {formatExpiryDate(link.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteLink(link.id)}
                      disabled={isExpired(link.expires_at)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Tips:</strong> Link undangan yang kedaluwarsa atau tidak aktif tidak dapat digunakan.
          Anda dapat membuat link baru kapan saja. Link yang telah mencapai batas penggunaan maksimal
          akan otomatis tidak dapat digunakan lagi.
        </AlertDescription>
      </Alert>
    </div>
  );
}
