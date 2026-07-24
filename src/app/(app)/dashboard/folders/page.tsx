import { listFolderItems } from "@/actions/folders";
import { FolderManagerClient } from "./folder-manager-client";
import { requireUserId, getBusinessProfile } from "@/lib/session";

export default async function FoldersPage({
  searchParams,
}: {
  searchParams?: Promise<{ path?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPath = params?.path || "/";
  const searchQuery = params?.search || "";

  const userId = await requireUserId();
  const [items, profile] = await Promise.all([
    listFolderItems({ path: currentPath, search: searchQuery }),
    getBusinessProfile(userId),
  ]);

  return (
    <FolderManagerClient
      items={items}
      currentPath={currentPath}
      searchQuery={searchQuery}
      userName={profile.businessName || "Me"}
    />
  );
}
