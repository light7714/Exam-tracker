import { RevisionBoard } from "@/components/revision-board";
import { requireAccess } from "@/lib/auth";
import { getRevisionBoard } from "@/lib/store";

export default async function RevisionPage() {
  await requireAccess();

  const board = await getRevisionBoard();

  return <RevisionBoard initialBoard={board} />;
}
