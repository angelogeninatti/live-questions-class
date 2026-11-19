import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from './CopyButton';

interface QRCodeBoxProps {
  url: string;
  /** Lato del QR in pixel: grande quando si proietta l'ingresso, piccolo a lato. */
  size?: number;
}

/** QR code e link per far entrare gli studenti. */
export function QRCodeBox({ url, size = 280 }: QRCodeBoxProps) {
  // Nel testo mostrato togliamo "https://" per renderlo più facile da digitare.
  const displayUrl = url.replace(/^https?:\/\//, '');
  return (
    <figure className="qr-box">
      <QRCodeSVG value={url} size={size} marginSize={2} level="M" title="QR code per entrare nel quiz" />
      <figcaption>
        <a href={url} target="_blank" rel="noreferrer" className="qr-url">
          {displayUrl}
        </a>
        <CopyButton text={url} label="Copia link" className="button small secondary" />
      </figcaption>
    </figure>
  );
}
