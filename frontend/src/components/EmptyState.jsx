import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Inbox, Search } from "lucide-react"

export function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  className 
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-4">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
            {description}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </CardContent>
    </Card>
  )
}

export function EmptySearchState({ searchTerm, onClear }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No payments found matching "${searchTerm}". Try adjusting your search terms.`}
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        )
      }
    />
  )
}
