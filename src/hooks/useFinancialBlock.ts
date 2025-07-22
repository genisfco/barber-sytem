import { usePlatformPayments } from "@/hooks/usePlatformPayments";
import { useEffect, useState } from "react";

export function useFinancialBlock() {
  const { freeTrialStatus, platformPayments, isLoading } = usePlatformPayments();
  const [blockInfo, setBlockInfo] = useState({ blocked: false, pendingMonths: [] as any[] });

  useEffect(() => {
    if (isLoading || !platformPayments) return;

    // 1. Se está em período gratuito, nunca bloqueia
    if (freeTrialStatus?.isFreeTrial) {
      setBlockInfo({ blocked: false, pendingMonths: [] });
      return;
    }

    // 2. Verifica o dia atual
    const today = new Date();
    const currentDay = today.getDate();

    // 3. Se está no período de carência (1 a 15), não bloqueia
    if (currentDay <= 15) {
      setBlockInfo({ blocked: false, pendingMonths: [] });
      return;
    }

    // 4. A partir do dia 16, verifica pendências dos meses anteriores
    const monthsToCheck = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthsToCheck.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const pendings = monthsToCheck
      .map(({ month, year }) =>
        platformPayments.find(
          (p: any) => p.month === month && p.year === year && p.payment_status !== "paid"
        )
      )
      .filter(Boolean);

    if (pendings.length > 0) {
      setBlockInfo({ blocked: true, pendingMonths: pendings });
    } else {
      setBlockInfo({ blocked: false, pendingMonths: [] });
    }
  }, [freeTrialStatus, platformPayments, isLoading]);

  return blockInfo;
} 