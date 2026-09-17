import { PageHeader } from "@/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatRow } from "./components/StatRow";
import { ModelRow } from "@/components/domain/ModelRow";
import { OpsGrid } from "./components/OpsGrid";
import { WamStatsRow } from "./components/WamStatsRow";
import { CompanyDistribution } from "./components/CompanyDistribution";

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Button variant="secondary">Config WAM</Button>
            <Button variant="primary">Actualizar</Button>
          </>
        }
      />
      <div className="flex flex-col gap-5 p-[26px_38px_38px]">
        <StatRow />
        <ModelRow />
        <OpsGrid />
        <WamStatsRow />
        <CompanyDistribution />
      </div>
    </>
  );
}
