import ResidentDetail from "./resident-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResidentDetail id={id} />;
}
