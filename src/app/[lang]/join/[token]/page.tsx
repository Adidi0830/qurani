"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Lock,
  Globe,
  UserCheck,
  Loader2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getInvitationByToken, joinGroupViaLink } from "@/utils/api/grup/invitation-links";
import { InvitationLinkWithGroup } from "@/types/grup";
import { useI18n } from "@/components/providers/i18n-provider";
import { ClientCache } from "@/utils/cache/client-cache";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function JoinGroupPage({ params }: PageProps) {
  const router = useRouter();
  const { customUser, profile, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [invitation, setInvitation] = useState<InvitationLinkWithGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Unwrap params using React.use()
  const resolvedParams = React.use(params);

  useEffect(() => {
    if (resolvedParams?.token) {
      setToken(resolvedParams.token);
    }
  }, [resolvedParams]);

  const loadInvitationData = React.useCallback(async () => {
    if (!token) {
      setError(t('join grup.error.invalid_token', 'Token undangan tidak valid'));
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const result = await getInvitationByToken(token);
      if (result.status === "success" && result.data) {
        setInvitation(result.data);
      } else {
        setError(result.message || t('join grup.error.description', 'Link undangan tidak valid'));
      }
    } catch (err) {
      console.error("Error loading invitation:", err);
      setError(t('join grup.error.load_error', 'Terjadi kesalahan saat memuat undangan'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    if (!authLoading && token) {
      loadInvitationData();
    }
  }, [token, authLoading, loadInvitationData]);

  const handleJoinGroup = async () => {
    if (!customUser) {
      toast.error(t('join grup.toast.login_required', 'Anda harus login terlebih dahulu'));
      router.push(`/login?redirect=/join/${token}`);
      return;
    }

    if (!token) {
      toast.error(t('join grup.toast.invalid_token', 'Token undangan tidak valid'));
      return;
    }

    try {
      setJoining(true);
      const result = await joinGroupViaLink(token);

      if (result.status === "success") {
        toast.success(result.message || t('join grup.toast.join_success', 'Berhasil bergabung ke grup!'));

        // Invalidate groups cache to ensure fresh data is loaded
        if (customUser?.userId) {
          ClientCache.invalidateUserGroupsCache(customUser.userId.toString());
        }

        // Redirect to group page or groups list
        setTimeout(() => {
          router.push("/grup");
        }, 1500);
      } else {
        toast.error(result.message);
        // Jika sudah member, redirect ke grup saya
        if (result.message?.includes("sudah menjadi anggota")) {
          setTimeout(() => {
            router.push("/grup");
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Error joining group:", err);
      toast.error(t('join grup.toast.join_error', 'Terjadi kesalahan saat bergabung ke grup'));
    } finally {
      setJoining(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push(`/login?redirect=/join/${token}`);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="max-w-2xl w-full dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-800/25">
          <CardContent className="space-y-4 py-12">
            <div className="flex items-center gap-4 animate-pulse">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2 flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
            </div>
            <div className="space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <Card className="max-w-2xl w-full dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-800/25">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 dark:bg-destructive/20 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="dark:text-white">{t('join grup.error.title', 'Undangan Tidak Valid')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert className="dark:bg-gray-700 dark:border-gray-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="dark:text-slate-400 text-base">
                {error || t('join grup.error.description', 'Link undangan tidak ditemukan atau telah kedaluwarsa')}
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              <Button
                onClick={() => router.push("/grup")}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {t('join grup.actions.search_other', 'Cari Grup Lain')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full dark:border-gray-600 dark:text-slate-400 dark:hover:bg-gray-700"
              >
                {t('join grup.actions.back_dashboard', 'Kembali ke Dashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const group = invitation.grup;
  const expiresAt = new Date(invitation.expires_at);
  const now = new Date();
  const isExpired = now > expiresAt;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="max-w-2xl w-full dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-800/25">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-3 dark:text-white">
            <div className="p-2 rounded-full bg-green-50 dark:bg-green-900/20">
              <Users className="h-8 w-8 text-primary" />
            </div>
            {t('join grup.header.title', 'Undangan Bergabung Grup')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group Info */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 dark:bg-muted/20 rounded-lg">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={group.photo_path ?
                  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/qurani_storage/${group.photo_path}` :
                  undefined
                }
                alt={group.name}
              />
              <AvatarFallback className="text-lg font-semibold">
                {group.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xl truncate">{group.name}</h3>
              {group.description && (
                <p className="text-muted-foreground text-sm mt-1 line-clamp-3">
                  {group.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3">
                {group.is_private ? (
                  <Badge variant="secondary" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    {t('join grup.group_info.private', 'Private')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    {t('join grup.group_info.public', 'Public')}
                  </Badge>
                )}
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="space-y-4">
            {!customUser ? (
              <>
                <Alert>
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription>
                    {t('join grup.actions.login_required', 'Anda harus login terlebih dahulu untuk bergabung ke grup')}
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-gradient-to-r dark:text-gray-100 from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  size="lg"
                >
                  {t('join grup.actions.login_button', 'Login untuk Bergabung')}
                </Button>
              </>
            ) : isExpired ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('join grup.actions.expired', 'Link undangan telah kedaluwarsa')}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex gap-3">
                  <Button
                    onClick={handleJoinGroup}
                    disabled={joining}
                    className="flex-1 bg-gradient-to-r dark:text-gray-100 from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    size="lg"
                  >
                    {joining ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('join grup.actions.joining', 'Bergabung...')}
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-5 w-5 mr-2" />
                        {t('join grup.actions.join_button', 'Bergabung ke Grup')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                    disabled={joining}
                    size="lg"
                  >
                    {t('join grup.actions.cancel', 'Batal')}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t dark:border-slate-700 pt-4 mt-6">
            <p>{t('join grup.footer.terms', 'Dengan bergabung, Anda menyetujui untuk mengikuti aturan grup')}</p>
            {customUser && (
              <p className="mt-1">
                {t('join grup.footer.joining_as', 'Bergabung sebagai: {username}').replace('{username}', profile?.username || profile?.name || 'User')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
