import { RevisionBoard } from "@/components/revision-board";
import { getRevisionBoard } from "@/lib/store";

export default async function RevisionPage() {
  const board = await getRevisionBoard();

  return <RevisionBoard initialBoard={board} />;
}
