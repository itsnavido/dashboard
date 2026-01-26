import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export function PaymentStatusBadge({ processed, onClick }) {
  if (processed === true || processed === 'TRUE' || processed === 'true') {
    return (
      <Badge
        variant="success"
        className="cursor-pointer gap-1"
        onClick={onClick}
      >
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </Badge>
    );
  }
  
  return (
    <Badge
      variant="warning"
      className="cursor-pointer gap-1"
      onClick={onClick}
    >
      <XCircle className="h-3 w-3" />
      Unpaid
    </Badge>
  );
}

