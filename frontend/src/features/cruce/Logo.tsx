export function Logo({ word = true }: { word?: boolean }) {
  return <span className="cr-logo"><svg viewBox="0 0 100 100" aria-hidden="true"><path className="cr-logo__mark" d="M14 78 C47.12 78 52.88 22 86 22" /><path className="cr-logo__mark" d="M14 22 C47.12 22 52.88 78 86 78" /></svg>{word && <span className="cr-logo__word">Cruce</span>}</span>
}
