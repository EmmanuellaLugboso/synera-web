import InlineAlert from "./InlineAlert";
import Button from "./Button";
import Skeleton from "./Skeleton";

export default function PageState({ type = "loading", message, onRetry }) {
  if (type === "loading") {
    return (
      <div className="ui-page-state" role="status" aria-live="polite">
        <Skeleton lines={3} />
        {message ? <p className="ui-page-state__copy">{message}</p> : null}
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="ui-page-state" role="status" aria-live="polite">
        <InlineAlert type="error">{message || "Something went wrong."}</InlineAlert>
        {onRetry ? (
          <Button variant="secondary" size="sm" type="button" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ui-page-state" role="status" aria-live="polite">
      <p className="ui-page-state__copy">{message || "Nothing here yet."}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" type="button" onClick={onRetry}>
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
