import { CinematicDemoPage } from "@/components/CinematicDemoPage";
import { DEMO_VERSIONS } from "@/lib/demo-config";

export const metadata = { title: "Dennis Dirtworx — Hero Version A" };

export default function VersionAPage() {
  return <CinematicDemoPage config={DEMO_VERSIONS["version-a"]} />;
}
