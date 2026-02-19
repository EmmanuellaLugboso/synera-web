import "./loading.css";

export default function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-box">
        <h2 className="loading-title">Setting things up...</h2>

        <div className="progress-bar">
          <div className="progress-fill" />
        </div>
      </div>
    </div>
  );
}
