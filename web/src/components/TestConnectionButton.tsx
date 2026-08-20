import { isApiClientError } from '../api/client';
import { useTestConnection } from '../api/environments';
import { Button } from './ui/Button';

export function TestConnectionButton({ environmentId }: { environmentId: string }) {
  const test = useTestConnection(environmentId);

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={test.isPending}
        onClick={() => test.mutate()}
      >
        {test.isPending ? 'Testing…' : 'Test connection'}
      </Button>
      {test.isSuccess && (
        <span className="text-sm text-black/70">
          Connected — {test.data.taskCount} permissions available
        </span>
      )}
      {test.isError && (
        <span className="text-sm text-beetroot">
          {isApiClientError(test.error) ? test.error.message : 'Connection failed'}
        </span>
      )}
    </div>
  );
}
