"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Users, Check, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { inviteMember } from "@/utils/api/grup/members"
import { useI18n } from "@/components/providers/i18n-provider"

export function TestInvitationSystem() {
  const { t } = useI18n()
  const [inviteEmail, setInviteEmail] = useState("")
  const [isInviting, setIsInviting] = useState(false)
  const [testGroupId, setTestGroupId] = useState("test-group-123")

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error(t("test_invitation.errors.email_empty", "Email cannot be empty"))
      return
    }

    if (!inviteEmail.includes('@')) {
      toast.error(t("test_invitation.errors.email_invalid", "Invalid email format"))
      return
    }

    setIsInviting(true)
    try {
      const result = await inviteMember(testGroupId, inviteEmail)

      if (result.status === 'success') {
        toast.success(result.message)
        setInviteEmail("")
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(t("test_invitation.errors.send_failed", "Failed to send invitation"))
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("test_invitation.title", "Group Invitation Notification Test")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Group Info */}
          <div className="space-y-2">
            <Label htmlFor="group-id">{t("test_invitation.group_id_label", "Test Group ID")}</Label>
            <Input
              id="group-id"
              value={testGroupId}
              onChange={(e) => setTestGroupId(e.target.value)}
              placeholder={t("test_invitation.group_id_placeholder", "Enter group ID for testing")}
            />
            <p className="text-sm text-muted-foreground">
              {t("test_invitation.group_id_help", "Group ID that will be used to send test invitations")}
            </p>
          </div>

          <Separator />

          {/* Invite Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("test_invitation.email_label", "Invitation Email")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="example@email.com"
                disabled={isInviting}
              />
              <p className="text-sm text-muted-foreground">
                {t("test_invitation.email_help", "Enter the email that will receive the group invitation")}
              </p>
            </div>

            <Button
              onClick={handleSendInvitation}
              disabled={isInviting || !inviteEmail.trim() || !testGroupId.trim()}
              className="w-full"
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("test_invitation.sending", "Sending Invitation...")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("test_invitation.send_button", "Send Test Invitation")}
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("test_invitation.instructions_title", "Testing Steps:")}</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>{t("test_invitation.instructions.0", "Enter a target email that is already registered in the system")}</li>
              {/* <li>Klik tombol "Kirim Undangan Test"</li> */}
              <li>{t("test_invitation.instructions.1", "The system will create a group invitation notification")}</li>
              <li>{t("test_invitation.instructions.2", "Log in with the target account on the notifications page")}</li>
              <li>{t("test_invitation.instructions.3", "View the invitation notification and test the Accept/Reject buttons")}</li>
            </ol>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("test_invitation.features_title", "Implemented Features:")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.0", "API to send group invitations")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.1", "Real-time notifications")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.2", "Accept invitation button")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.3", "Reject invitation button")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.4", "Notification status updates")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{t("test_invitation.features.5", "Validation and error handling")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
