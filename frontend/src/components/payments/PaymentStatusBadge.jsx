import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { isPaymentPaid } from '@/utils';

export function PaymentStatusBadge({ columnQ, onClick }) {
  const isPaid = isPaymentPaid(columnQ);
  
  return (
    <Badge
      variant={isPaid ? 'success' : 'warning'}
      className="cursor-pointer gap-1"
      onClick={onClick}
    >
      {isPaid ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Paid
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" />
          Unpaid
        </>
      )}
    </Badge>
  );
}

