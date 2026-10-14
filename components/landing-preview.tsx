const WAITING = ["Priya", "Arjun", "Meera", "Sam", "Nica", "John"];

const QR_CELLS = [
  1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1,
  0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
];

function QrStub({ className }: { className?: string }) {
  return (
    <div className={className}>
      {QR_CELLS.map((on, index) => (
        <span key={index} className={on ? "is-on" : undefined} />
      ))}
    </div>
  );
}

export function LandingPreview() {
  return (
    <div className="landing-preview" aria-hidden="true" inert>
      <div className="landing-glow" />
      <div className="landing-board">
        <aside className="landing-rail">
          <span className="landing-rail-mark">Q</span>
          <span className="landing-rail-dot" />
          <span className="landing-rail-dot" />
          <span className="landing-rail-dot is-live" />
        </aside>
        <div className="landing-board-body">
          <header className="landing-board-top">
            <p className="landing-board-title">Desk</p>
            <span className="landing-live">Live</span>
          </header>
          <div className="landing-board-grid">
            <div className="landing-stat">
              <p>Current tickets</p>
              <p className="landing-stat-num">03</p>
              <p>Average wait: 5m</p>
            </div>
            <div className="landing-wait">
              <p>Waiting</p>
              <ol>
                {WAITING.map((name, index) => (
                  <li key={name} className={index === 0 ? "is-now" : undefined}>
                    {name}
                  </li>
                ))}
              </ol>
            </div>
            <div className="landing-qr-card">
              <p>Active card</p>
              <QrStub className="landing-qr" />
            </div>
          </div>
        </div>
      </div>
      <div className="landing-phone">
        <p className="landing-phone-place">Your place: 3</p>
        <p className="landing-phone-live">Live updates</p>
        <div className="landing-phone-scan">
          <QrStub className="landing-qr landing-qr-phone" />
          <span className="landing-scan-line" />
        </div>
      </div>
    </div>
  );
}
