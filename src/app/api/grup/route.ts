import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendGroupInviteNotification } from "@/utils/api/notifikasi/server";
import { generateId } from "@/lib/generateId";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const action = searchParams.get("action") || "getGroups";

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    switch (action) {
      case "getGroups": {
        // Use existing fetchGroups logic but adapted for API route
        const { data, error } = await supabase
          .from("grup_members")
          .select(
            `
            role,
            grup:grup_id (
              id,
              name,
              description,
              photo_path,
              is_private,
              created_at,
              deleted_at,
              country_id,
              country_name,
              state_id,
              state_name,
              city_id,
              city_name,
              grup_members(count),
              category:category_id (
                id
              )
            ),
            user_id
          `
          )
          .eq("user_id", userId);

        if (error) {
          console.error("Error fetching groups:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          data: data || [],
        });
      }

      case "getAllGroups": {
        // Fetch all groups with user membership status
        const { data, error } = await supabase
          .from("grup")
          .select(
            `
            id,
            name,
            description,
            photo_path,
            is_private,
            created_at,
            deleted_at,
            type,
            country_id,
            country_name,
            state_id,
            state_name,
            city_id,
            city_name,
            category:category_id (
              id
            ),
            grup_members!grup_members_grup_id_fkey (
              user_id,
              role
            )
          `
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching all groups:", error);
          throw error;
        }

        // Process groups to add membership info and hide secret groups from non-members
        const processedGroups = (data || []).map((group) => {
          // Find user's membership in this group
          const userMembership = group.grup_members?.find(
            (member: { user_id: string }) => member.user_id === userId
          );

          // Hide secret groups if user is not a member
          if (group.type === "secret" && !userMembership) {
            return null;
          }

          return {
            role: userMembership?.role || null,
            grup: {
              id: group.id,
              name: group.name,
              description: group.description,
              photo_path: group.photo_path,
              is_private: group.is_private,
              created_at: group.created_at,
              deleted_at: group.deleted_at,
              type: group.type,
              country_id: group.country_id,
              country_name: group.country_name,
              state_id: group.state_id,
              state_name: group.state_name,
              city_id: group.city_id,
              city_name: group.city_name,
              category: group.category,
              grup_members: [{ count: group.grup_members?.length || 0 }]
            },
            is_member: !!userMembership,
            user_role: userMembership?.role || null
          };
        }).filter(Boolean); // Remove null entries (secret groups)

        return NextResponse.json({
          success: true,
          data: processedGroups || [],
        });
      }

      case "searchGroups": {
        const query = searchParams.get("query");
        if (!query) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }

        const { data: joinedGroups } = await supabase
          .from("grup_members")
          .select("grup_id")
          .eq("user_id", userId);

        const joinedGroupIds = joinedGroups?.map((g) => g.grup_id) || [];

        // Use existing fetchGroupBySearch logic
        const { data, error } = await supabase
          .from("grup_with_membership")
          .select(
            `
            id,
            name,
            description,
            photo_path,
            owner_id,
            is_private,
            created_at,
            deleted_at,
            province_name: state_name,
            city_name,
            country_id,
            country_name,
            state_id,
            city_id,
            grup_members (
              user_id,
              grup:grup_id (
                category:category_id (
                  id
                )
              )
            ),
            is_member,
            type
          `
          )
          .is("deleted_at", null)
          .ilike("name", `%${query}%`)
          .neq("owner_id", userId)
          .neq("type", "secret")
          .not("id", "in", `(${joinedGroupIds.join(",")})`)
          .limit(10);

        console.log("data", JSON.stringify(data, null, 2));

        if (error) {
          console.error("Error searching groups:", error);
          throw error;
        }

        // Filter out parser errors and type assert valid groups
        const validGroups = (
          (data || []) as unknown as Array<
            { id: string } & Record<string, unknown>
          >
        ).filter(
          (group) =>
            group &&
            typeof group === "object" &&
            "id" in group &&
            typeof group.id === "string"
        );

        // Check for pending join requests for each group
        const groupIds = validGroups.map((group) => group.id);

        let joinRequestsMap: Record<string, boolean> = {};
        if (groupIds.length > 0) {
          const { data: joinRequests } = await supabase
            .from("grup_join_req")
            .select("grup_id")
            .eq("user_id", userId)
            .eq("status", "request")
            .in("grup_id", groupIds);

          // Create a map for quick lookup
          joinRequestsMap = (joinRequests || []).reduce((acc, req) => {
            acc[req.grup_id] = true;
            return acc;
          }, {} as Record<string, boolean>);
        }

        // Add has_requested_join field to each group
        const groupsWithRequestStatus = validGroups.map((group) => ({
          ...group,
          has_requested_join: joinRequestsMap[group.id] || false,
        }));

        return NextResponse.json({
          success: true,
          data: groupsWithRequestStatus,
        });
      }

      case "getGroupDetail": {
        const groupId = searchParams.get("groupId");

        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        // Fetch group detail with members
        const { data, error } = await supabase
          .from("grup")
          .select(
            `
            id,
            name,
            description,
            photo_path,
            owner_id,
            is_private,
            created_at,
            deleted_at,
            type,
            city_name,
            province_name: state_name,
            category:category_id (
              id
            ),
            grup_members (
              id,
              role,
              user_id,
              user:user_profiles (
                id,
                name,
                email,
                username,
                nickname,
                avatar,
                countryName,
                stateName,
                cityName,
                created
              )
            )
          `
          )
          .eq("id", groupId)
          .single();

        if (error) {
          console.error("Error fetching group detail:", error);
          return NextResponse.json(
            {
              success: false,
              error: "Group not found or access denied",
            },
            { status: 404 }
          );
        }

        // Check if user is member
        const isMember = data.grup_members.some(
          (member: { user_id: string }) => member.user_id === userId
        );

        return NextResponse.json({
          success: true,
          data: { ...data, is_member: isMember },
        });
      }

      case "getGroupSettings": {
        const groupId = searchParams.get("groupId");

        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        console.log("Fetching settings for group:", groupId);

        // Step 1: Fetch global settings (default values)
        const { data: globalSettings, error: globalError } = await supabase
          .from("setting_global")
          .select("*");

        if (globalError) {
          console.error("Error fetching global settings:", globalError);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to fetch global settings: ${globalError.message}`,
            },
            { status: 500 }
          );
        }

        // Step 2: Fetch group-specific settings (overrides)
        const { data: groupSettings, error: groupError } = await supabase
          .from("setting_group")
          .select("*")
          .eq("group_id", groupId);

        if (groupError) {
          console.error("Error fetching group settings:", groupError);
          return NextResponse.json(
            {
              success: false,
              error: `Failed to fetch group settings: ${groupError.message}`,
            },
            { status: 500 }
          );
        }

        // Step 3: Merge global settings with group overrides
        let mergedData;
        if (groupSettings && groupSettings.length > 0) {
          // Map global settings and override with group settings if exists
          mergedData = globalSettings?.map((globalItem) => {
            const groupOverride = groupSettings.find(
              (g) => g.setting === globalItem.id
            );
            return groupOverride
              ? {
                  ...globalItem,
                  value: groupOverride.value,
                  color: groupOverride.color,
                  status: groupOverride.status ? 1 : 0,
                }
              : globalItem;
          });
        } else {
          // No group overrides, use global defaults
          mergedData = globalSettings;
        }

        console.log(
          "Settings merged successfully:",
          mergedData?.length || 0,
          "records"
        );

        return NextResponse.json({
          success: true,
          data: mergedData || [],
        });
      }

      case "getGroupMembers": {
        const groupId = searchParams.get("groupId");

        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        // Fetch group members with user details
        const { data, error } = await supabase
          .from("grup_members")
          .select(
            `
            id,
            role,
            user_id,
            user:user_profiles (
              id,
              name,
              username,
              nickname,
              avatar,
              countryName,
              stateName,
              cityName
            )
          `
          )
          .eq("grup_id", groupId)
          .order("created_at");

        if (error) {
          console.error("Error fetching group members:", error);
          return NextResponse.json(
            {
              success: false,
              error: "Failed to fetch group members",
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: data || [],
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Group API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, groupId, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    switch (action) {
      case "joinGroup": {
        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        const { error } = await supabase.from("grup_members").insert({
          id: generateId(),
          grup_id: groupId,
          user_id: userId,
          role: "member",
        });

        if (error) {
          console.error("Error joining group:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Successfully joined the group",
        });
      }

      case "requestJoinGroup": {
        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        const { error } = await supabase.from("grup_join_req").insert({
          id: generateId(),
          grup_id: groupId,
          user_id: userId,
          status: "request",
        });

        if (error) {
          console.error("Error joining group:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Successfully joined the group",
        });
      }

      case "leaveGroup": {
        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        const { error } = await supabase
          .from("grup_members")
          .delete()
          .eq("grup_id", groupId)
          .eq("user_id", userId);

        if (error) {
          console.error("Error leaving group:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Successfully left the group",
        });
      }

      case "createGroup": {
        const { name, description, status } = data;
        // Note: photo parameter removed as it's not implemented in API route yet

        if (!name || name.trim().length < 3) {
          return NextResponse.json(
            { error: "Group name must be at least 3 characters" },
            { status: 400 }
          );
        }

        // Handle photo upload if provided
        const photoPath = null; // TODO: Implement photo upload in API route
        // Note: Photo upload currently handled in component via insertGrup()
        // This is a limitation that will be addressed in future iterations

        // Insert group
        const { data: newGroup, error: groupError } = await supabase
          .from("grup")
          .insert({
            id: generateId(),
            name: name.trim(),
            owner_id: userId,
            description: description?.trim() || null,
            is_private: status === "private",
            photo_path: photoPath,
          })
          .select()
          .single();

        if (groupError) {
          console.error("Error creating group:", groupError);
          throw groupError;
        }

        // Add creator as owner
        const { error: memberError } = await supabase
          .from("grup_members")
          .insert({
            id: generateId(),
            grup_id: newGroup.id,
            user_id: userId,
            role: "owner",
          });

        if (memberError) {
          console.error("Error adding group member:", memberError);
          throw memberError;
        }

        return NextResponse.json({
          success: true,
          message: "Group created successfully",
          data: newGroup,
        });
      }

      case "updateGroupSettings": {
        const {
          layoutType,
          fontType,
          fontSize,
          pageMode,
          labels,
          errorLabels,
        } = data;

        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        // Check if user has permission to update settings (owner or admin)
        const { data: memberCheck, error: memberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          memberError ||
          !memberCheck ||
          !["owner", "admin"].includes(memberCheck.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        // Get setting IDs from setting_global table first
        const { data: globalSettings, error: globalError } = await supabase
          .from("setting_global")
          .select("id, key")
          .in("key", ["tata-letak", "font", "font-size", "kesimpulan"]);

        if (globalError) {
          console.error("Error fetching global settings:", globalError);
          throw globalError;
        }

        // Create mapping of keys to setting IDs
        const keyToSettingId = globalSettings.reduce((acc, setting) => {
          acc[setting.key] = setting.id;
          return acc;
        }, {} as Record<string, number>);

        // Update settings in batch
        const settingsToUpdate = [];

        if (layoutType !== undefined) {
          const settingId = keyToSettingId["tata-letak"];
          if (settingId) {
            settingsToUpdate.push({
              group_id: groupId,
              setting: settingId,
              value: layoutType,
              status: 1,
            });
          }
        }
        if (fontType !== undefined) {
          const settingId = keyToSettingId["font"];
          if (settingId) {
            settingsToUpdate.push({
              group_id: groupId,
              setting: settingId,
              value: fontType,
              status: 1,
            });
          }
        }
        if (fontSize !== undefined) {
          const settingId = keyToSettingId["font-size"];
          if (settingId) {
            settingsToUpdate.push({
              group_id: groupId,
              setting: settingId,
              value: fontSize.toString(),
              status: 1,
            });
          }
        }
        if (pageMode !== undefined) {
          const settingId = keyToSettingId["kesimpulan"];
          if (settingId) {
            settingsToUpdate.push({
              group_id: groupId,
              setting: settingId,
              value: pageMode,
              status: 1,
            });
          }
        }

        // Update each setting
        for (const setting of settingsToUpdate) {
          const { error } = await supabase.from("setting_group").upsert({
            group_id: setting.group_id,
            setting: setting.setting,
            value: setting.value,
            status: setting.status,
          });

          if (error) {
            console.error("Error updating setting:", error);
            throw error;
          }
        }

        // Update labels if provided
        if (labels && Array.isArray(labels)) {
          for (const label of labels) {
            const { error } = await supabase.from("setting_group").upsert({
              group_id: groupId,
              setting: label.id,
              value: label.value,
              color: label.color,
              status: label.status,
            });

            if (error) {
              console.error("Error updating label:", error);
              throw error;
            }
          }
        }

        // Update error labels (verse/word errors) if provided
        if (errorLabels && Array.isArray(errorLabels)) {
          for (const errorLabel of errorLabels) {
            const { error } = await supabase.from("setting_group").upsert({
              group_id: groupId,
              setting: errorLabel.id,
              value: errorLabel.value,
              color: errorLabel.color,
              status: errorLabel.status,
            });

            if (error) {
              console.error("Error updating error label:", error);
              throw error;
            }
          }
        }

        // Invalidate cache after successful update
        try {
          const { invalidateSettingGroupCache } = await import(
            "@/utils/api/setting group/fetch"
          );
          await invalidateSettingGroupCache(groupId);
        } catch (cacheError) {
          console.warn("Failed to invalidate cache:", cacheError);
        }

        return NextResponse.json({
          success: true,
          message: "Group settings updated successfully",
        });
      }

      case "resetGroupSettings": {
        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        // Check if user has permission to reset settings (owner or admin)
        const { data: memberCheck, error: memberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          memberError ||
          !memberCheck ||
          !["owner", "admin"].includes(memberCheck.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        // Delete all group settings
        const { error } = await supabase
          .from("setting_group")
          .delete()
          .eq("group_id", groupId);

        if (error) {
          console.error("Error resetting group settings:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Group settings reset successfully",
        });
      }

      case "updateErrorLabel": {
        const { id, value, color, status } = data;

        console.log("updateErrorLabel called with:", {
          id,
          value,
          color,
          status,
          groupId,
          userId,
        });

        if (!groupId) {
          return NextResponse.json(
            { error: "Group ID is required" },
            { status: 400 }
          );
        }

        // Check if user has permission to update labels (owner or admin)
        const { data: memberCheck, error: memberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          memberError ||
          !memberCheck ||
          !["owner", "admin"].includes(memberCheck.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }

        // Update or insert the label using upsert
        const { error } = await supabase.from("setting_group").upsert({
          group_id: groupId,
          setting: id,
          value,
          color,
          status,
        });

        if (error) {
          console.error("Error updating error label:", error);
          throw error;
        }

        // Invalidate cache after successful update
        try {
          const { invalidateSettingGroupCache } = await import(
            "@/utils/api/setting group/fetch"
          );
          await invalidateSettingGroupCache(groupId);
        } catch (cacheError) {
          console.warn("Failed to invalidate cache:", cacheError);
        }

        return NextResponse.json({
          success: true,
          message: "Error label updated successfully",
        });
      }

      case "promoteMember": {
        const { memberId } = data;

        if (!groupId || !memberId) {
          return NextResponse.json(
            { error: "Group ID and Member ID are required" },
            { status: 400 }
          );
        }

        // Check if user has permission to promote (owner only)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (userMemberError || !userMember || userMember.role !== "owner") {
          return NextResponse.json(
            { error: "Only group owner can promote members" },
            { status: 403 }
          );
        }

        // Promote member to admin
        const { error } = await supabase
          .from("grup_members")
          .update({ role: "admin" })
          .eq("grup_id", groupId)
          .eq("user_id", memberId);

        if (error) {
          console.error("Error promoting member:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Member promoted to admin successfully",
        });
      }

      case "demoteMember": {
        const { memberId } = data;

        if (!groupId || !memberId) {
          return NextResponse.json(
            { error: "Group ID and Member ID are required" },
            { status: 400 }
          );
        }

        // Check if user has permission to demote (owner only)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (userMemberError || !userMember || userMember.role !== "owner") {
          return NextResponse.json(
            { error: "Only group owner can demote members" },
            { status: 403 }
          );
        }

        // Demote admin to member
        const { error } = await supabase
          .from("grup_members")
          .update({ role: "member" })
          .eq("grup_id", groupId)
          .eq("user_id", memberId);

        if (error) {
          console.error("Error demoting member:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Admin demoted to member successfully",
        });
      }

      case "removeMember": {
        const { memberId } = data;

        if (!groupId || !memberId) {
          return NextResponse.json(
            { error: "Group ID and Member ID are required" },
            { status: 400 }
          );
        }

        // Check if user has permission to remove (owner or admin)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          userMemberError ||
          !userMember ||
          !["owner", "admin"].includes(userMember.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to remove member" },
            { status: 403 }
          );
        }

        // Don't allow removing owner
        const { data: targetMember, error: targetMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", memberId)
          .single();

        if (targetMemberError || !targetMember) {
          return NextResponse.json(
            { error: "Member not found" },
            { status: 404 }
          );
        }

        if (targetMember.role === "owner") {
          return NextResponse.json(
            { error: "Cannot remove group owner" },
            { status: 403 }
          );
        }

        // Remove member
        const { error } = await supabase
          .from("grup_members")
          .delete()
          .eq("grup_id", groupId)
          .eq("user_id", memberId);

        if (error) {
          console.error("Error removing member:", error);
          throw error;
        }

        return NextResponse.json({
          success: true,
          message: "Member removed successfully",
        });
      }

      case "inviteMember": {
        const { username } = data;

        if (!groupId || !username) {
          return NextResponse.json(
            { error: "Group ID and username are required" },
            { status: 400 }
          );
        }

        // Check if user has permission to invite (owner or admin)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          userMemberError ||
          !userMember ||
          !["owner", "admin"].includes(userMember.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to invite members" },
            { status: 403 }
          );
        }

        // Delegate to sendGroupInviteNotification which handles everything
        const result = await sendGroupInviteNotification(
          username,
          groupId,
          userId
        );

        if (!result.success) {
          return NextResponse.json(
            {
              error: result.error || "Failed to send invitation",
            },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: result.message || "Invitation sent successfully",
        });
      }

      case "acceptJoinRequest": {
        const { requestId, requesterUserId } = data;

        if (!groupId || !requestId || !requesterUserId) {
          return NextResponse.json(
            {
              error: "Group ID, Request ID, and Requester User ID are required",
            },
            { status: 400 }
          );
        }

        // Check if user has permission (owner or admin)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          userMemberError ||
          !userMember ||
          !["owner", "admin"].includes(userMember.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to accept join requests" },
            { status: 403 }
          );
        }

        // Check if requester is already a member
        const { data: existingMember } = await supabase
          .from("grup_members")
          .select("id")
          .eq("grup_id", groupId)
          .eq("user_id", requesterUserId)
          .single();

        if (existingMember) {
          // Update request status to accepted even if already member
          await supabase
            .from("grup_join_req")
            .update({ status: "accepted" })
            .eq("id", requestId);

          return NextResponse.json({
            success: true,
            message: "User is already a member. Request status updated.",
          });
        }

        // Add user to group
        const { error: memberError } = await supabase
          .from("grup_members")
          .insert({
            id: generateId(),
            grup_id: groupId,
            user_id: requesterUserId,
            role: "member",
          });

        if (memberError) {
          console.error("Error adding member:", memberError);
          return NextResponse.json(
            { error: "Failed to add member to group" },
            { status: 500 }
          );
        }

        // Update request status to accepted
        const { error: updateError } = await supabase
          .from("grup_join_req")
          .update({ status: "accepted" })
          .eq("id", requestId);

        if (updateError) {
          console.error("Error updating request status:", updateError);
          // Don't fail if update fails, member is already added
        }

        return NextResponse.json({
          success: true,
          message: "Join request accepted successfully",
        });
      }

      case "rejectJoinRequest": {
        const { requestId } = data;

        if (!groupId || !requestId) {
          return NextResponse.json(
            { error: "Group ID and Request ID are required" },
            { status: 400 }
          );
        }

        // Check if user has permission (owner or admin)
        const { data: userMember, error: userMemberError } = await supabase
          .from("grup_members")
          .select("role")
          .eq("grup_id", groupId)
          .eq("user_id", userId)
          .single();

        if (
          userMemberError ||
          !userMember ||
          !["owner", "admin"].includes(userMember.role)
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to reject join requests" },
            { status: 403 }
          );
        }

        // Update request status to rejected
        const { error: updateError } = await supabase
          .from("grup_join_req")
          .update({ status: "rejected" })
          .eq("id", requestId)
          .eq("grup_id", groupId);

        if (updateError) {
          console.error("Error rejecting join request:", updateError);
          return NextResponse.json(
            { error: "Failed to reject join request" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Join request rejected successfully",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Group POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
