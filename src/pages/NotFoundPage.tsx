import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden />}
      title="Page not found"
      description="That page doesn't exist."
      action={
        <Link
          to="/run"
          className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
        >
          Go to Run test
        </Link>
      }
    />
  );
}
