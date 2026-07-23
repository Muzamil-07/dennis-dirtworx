import { CinematicDemoPage } from "@/components/CinematicDemoPage";
import { DEMO_VERSIONS } from "@/lib/demo-config";

export const metadata = { title: "Dennis Dirtworx — Hero Version B" };

export default function VersionBPage() {
  return <CinematicDemoPage config={DEMO_VERSIONS["version-b"]} />;
}
