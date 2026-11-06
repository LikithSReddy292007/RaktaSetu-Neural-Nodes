import { useState, ChangeEvent } from 'react';
import Tesseract from 'tesseract.js';
import { Check, FileText, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';

interface DocumentVerificationModalProps {
  onClose: () => void;
  onSuccess: (updatedGroup: string) => void;
}

export function DocumentVerificationModal({ onClose, onSuccess }: DocumentVerificationModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [reviewStage, setReviewStage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
      setExtractedText('');
      setReviewStage(false);
    }
  };

  const processOcr = async () => {
    if (!imageFile) return;

    setScanning(true);
    setProgress(0);
    setError('');

    try {
      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setExtractedText(text);

      // Intelligent regex to detect blood group in document
      const groupMatch = text.match(/\b(A|B|AB|O)\s*([+-]|POS|NEG|POSITIVE|NEGATIVE)\b/i);
      if (groupMatch) {
        let grp = groupMatch[1].toUpperCase();
        const sign = groupMatch[2].toUpperCase();
        const suffix = sign.includes('-') || sign.includes('NEG') ? '-' : '+';
        setSelectedGroup(`${grp}${suffix}`);
      }

      setReviewStage(true);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError('Unable to parse text from image. Please ensure the document is clear and readable.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedGroup) {
      setError('Please select or confirm your verified blood group.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.submitVerification({
        extracted_blood_group: selectedGroup,
        document_type: 'blood_report_or_donor_card',
        notes: 'User verified via client-side OCR scan.',
      });
      onSuccess(selectedGroup);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '540px', width: '92%' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={19} />
        </button>

        <span className="modal-icon">
          <FileText size={21} fill="currentColor" />
        </span>
        <span className="eyebrow dark">DONOR VERIFICATION</span>
        <h2>Verify Blood Group via Document</h2>
        <p>
          Upload your blood test report, donor card, or government health certificate. Optical character recognition runs
          privately in your browser to extract your blood group.
        </p>

        {!reviewStage ? (
          <div>
            <label
              style={{
                border: '2px dashed #ded2c7',
                borderRadius: '6px',
                padding: '30px 20px',
                textAlign: 'center',
                display: 'block',
                cursor: 'pointer',
                background: '#fcfaf6',
                marginBottom: '16px',
              }}
            >
              <Upload size={32} color="#b13026" style={{ margin: '0 auto 10px auto' }} />
              <strong style={{ display: 'block', fontSize: '13px', color: '#423a35' }}>
                {imageFile ? imageFile.name : 'Choose blood report or donor card'}
              </strong>
              <small style={{ color: '#958a81', display: 'block', marginTop: '4px' }}>PNG, JPG or JPEG up to 10MB</small>
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>

            {previewUrl && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  style={{ maxHeight: '180px', maxWidth: '100%', borderRadius: '4px', border: '1px solid #e1d6ca' }}
                />
              </div>
            )}

            {scanning && (
              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>Scanning document text…</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#eee6de', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: '#b13026',
                      width: `${progress}%`,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <button
              className="button button-primary full-width"
              onClick={processOcr}
              disabled={!imageFile || scanning}
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="rs-spin" /> Analyzing with OCR…
                </>
              ) : (
                'Scan Document Text'
              )}
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                background: '#fdf7f4',
                border: '1px solid #f2d9d4',
                padding: '16px',
                borderRadius: '4px',
                marginBottom: '16px',
              }}
            >
              <span className="small-label" style={{ color: '#b13026' }}>
                DETECTED INFORMATION
              </span>
              <p style={{ fontSize: '12px', color: '#554a42', margin: '6px 0 12px 0' }}>
                Review and verify the extracted blood group before submitting:
              </p>

              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                Confirmed Blood Group:
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  style={{ marginTop: '6px' }}
                >
                  <option value="">Select blood group</option>
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </label>

              {extractedText && (
                <details style={{ marginTop: '12px', fontSize: '11px', color: '#776e66' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View raw OCR extracted text snippet</summary>
                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      background: '#fff',
                      padding: '8px',
                      borderRadius: '4px',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      marginTop: '6px',
                      fontSize: '10px',
                    }}
                  >
                    {extractedText.slice(0, 500)}
                  </pre>
                </details>
              )}
            </div>

            {error && <div className="form-error">{error}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="button button-secondary"
                onClick={() => setReviewStage(false)}
                disabled={submitting}
                style={{ flex: 1 }}
              >
                Scan Another
              </button>
              <button
                className="button button-primary"
                onClick={handleConfirm}
                disabled={submitting || !selectedGroup}
                style={{ flex: 1 }}
              >
                {submitting ? 'Saving…' : 'Confirm & Save'} <Check size={16} />
              </button>
            </div>
          </div>
        )}

        <small className="form-note" style={{ marginTop: '16px' }}>
          <ShieldCheck size={13} color="#5c9670" /> OCR is processed locally. Images are not stored publicly.
        </small>
      </div>
    </div>
  );
}

