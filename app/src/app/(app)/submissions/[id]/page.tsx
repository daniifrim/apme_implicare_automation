import SubmissionDetailPage from "@/app/dashboard/submissions/[id]/page";

export default function SubmissionPage(props: { params: { id: string } }) {
  return <SubmissionDetailPage {...props} />;
}
