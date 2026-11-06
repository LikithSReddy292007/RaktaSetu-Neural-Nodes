import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, HeartPulse, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';

interface BloodRequestModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface UploadedDoc {
  filename: string;
  mime_type: string;
  file_data: string;
  size_bytes: number;
}

export function BloodRequestModal({ onClose, onSuccess }: BloodRequestModalProps) {
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [severity, setSeverity] = useState('High — Emergency');
  const [hospital, setHospital] = useState('');
  const [notes, setNotes] = useState('');

  // Medical Proof Documents
  const [prescriptionDoc, setPrescriptionDoc] = useState<UploadedDoc | null>(null);
  const [admissionDoc, setAdmissionDoc] = useState<UploadedDoc | null>(null);
  const [processingType, setProcessingType] = useState<'prescription' | 'admission' | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const admissionInputRef = useRef<HTMLInputElement>(null);

  // Client-Side Image Resizer & Optimizer to prevent HTTP 413 Payload Too Large
  const compressImage = async (file: File): Promise<UploadedDoc> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image for optimization.'));
        img.onload = () => {
          const maxDimension = 1200;
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const raw = (event.target?.result as string) || '';
            resolve({
              filename: file.name,
              mime_type: file.type || 'image/jpeg',
              file_data: raw,
              size_bytes: file.size,
            });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);

          resolve({
            filename: file.name.replace(/\.[^.]+$/, '') + '.jpg',
            mime_type: 'image/jpeg',
            file_data: compressedDataUrl,
            size_bytes: approxBytes,
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    type: 'prescription' | 'admission'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting triggers change
    e.target.value = '';

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const isImage = file.type.toLowerCase().startsWith('image/');
    const isPdf = file.type.toLowerCase() === 'application/pdf';

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError(`Invalid format for ${file.name}. Only PDF, JPG, JPEG, and PNG files are accepted.`);
      return;
    }

    if (isPdf && file.size > 1.8 * 1024 * 1024) {
      setError(
        `PDF file ${file.name} is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To prevent payload limits, PDFs must be under 1.8MB. Alternatively, please take a photo of the document.`
      );
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError(`File ${file.name} is too large. Please select a file under 20MB.`);
      return;
    }

    setError('');
    setProcessingType(type);

    try {
      if (isImage) {
        const compressedDoc = await compressImage(file);
        if (type === 'prescription') {
          setPrescriptionDoc(compressedDoc);
        } else {
          setAdmissionDoc(compressedDoc);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = (reader.result as string) || '';
          const docData: UploadedDoc = {
            filename: file.name,
            mime_type: file.type || 'application/pdf',
            file_data: base64Data,
            size_bytes: file.size,
          };

          if (type === 'prescription') {
            setPrescriptionDoc(docData);
          } else {
            setAdmissionDoc(docData);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing document.');
    } finally {
      setProcessingType(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!patientName.trim()) {
      setError('Patient full name is mandatory.');
      return;
    }
    if (!bloodGroup) {
      setError('Required blood group must be selected.');
      return;
    }
    if (!severity) {
      setError('Severity level must be selected.');
      return;
    }
    if (!hospital.trim()) {
      setError('Hospital / Clinical facility details are mandatory.');
      return;
    }

    // Critical Requirement: Both documents are MANDATORY
    if (!prescriptionDoc || !admissionDoc) {
      setError('Required: Both Doctor Prescription and Admission Proof must be uploaded before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      await api.createRequest({
        patient_name: patientName.trim(),
        blood_group: bloodGroup,
        severity: severity,
        hospital: hospital.trim(),
        location: hospital.trim(),
        notes: notes.trim(),
        doctor_prescription: prescriptionDoc,
        admission_proof: admissionDoc,
      });

      onSuccess(
        'Blood request submitted successfully with medical proofs! It is now Pending Verification before donor matching begins.'
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ maxWidth: '640px', padding: '35px' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={19} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <span className="modal-icon" style={{ margin: 0, width: '46px', height: '46px' }}>
            <HeartPulse size={24} />
          </span>
          <div>
            <span className="eyebrow dark" style={{ letterSpacing: '1.2px', fontSize: '10px' }}>
              EMERGENCY COORDINATION
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '26px', letterSpacing: '-0.8px' }}>BLOOD REQUEST</h2>
            <small style={{ color: '#887d74', fontSize: '12px' }}>Submit your request with medical proof.</small>
          </div>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: '18px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          {/* 1. Patient Full Name */}
          <label>
            Patient Full Name <span style={{ color: '#b13026' }}>*</span>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Full name of patient"
              required
            />
          </label>

          {/* 2. Blood Group & 3. Severity Level */}
          <div className="form-grid">
            <label>
              Blood Group Required <span style={{ color: '#b13026' }}>*</span>
              <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} required>
                <option value="" disabled>
                  Select blood group
                </option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </label>

            <label>
              Severity Level <span style={{ color: '#b13026' }}>*</span>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} required>
                <option value="High — Emergency">High — Emergency</option>
                <option value="Medium — Urgent">Medium — Urgent</option>
                <option value="Low — Normal">Low — Normal</option>
              </select>
            </label>
          </div>

          {/* 4. Hospital / Clinical Facility */}
          <label>
            Hospital / Clinical Facility <span style={{ color: '#b13026' }}>*</span>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="Full hospital name and address"
              required
            />
          </label>

          {/* 5. MEDICAL PROOF (REQUIRED) - TWO SEPARATE UPLOAD SECTIONS SIDE BY SIDE */}
          <div style={{ marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ fontSize: '13px', color: '#2d2824', letterSpacing: '-0.3px' }}>
                MEDICAL PROOF <span style={{ color: '#b13026' }}>(REQUIRED)</span>
              </strong>
              <small style={{ fontSize: '10px', color: '#887d74' }}>PDF, JPG, JPEG, PNG (Max 5MB)</small>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {/* UPLOAD SECTION A: Doctor Prescription */}
              <div
                style={{
                  border: `1px ${prescriptionDoc ? 'solid #4d895f' : 'dashed #d4c6b8'}`,
                  background: prescriptionDoc ? '#f3faf4' : '#fcfaf6',
                  borderRadius: '4px',
                  padding: '16px',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={prescriptionInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'prescription')}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                  {processingType === 'prescription' ? (
                    <Loader2 size={20} className="animate-spin" color="#b13026" />
                  ) : prescriptionDoc ? (
                    <CheckCircle2 size={20} color="#3d8250" />
                  ) : (
                    <UploadCloud size={22} color="#b13026" />
                  )}
                  <strong style={{ fontSize: '13px', color: prescriptionDoc ? '#2e6b3f' : '#282421' }}>
                    Doctor Prescription
                  </strong>
                </div>

                {processingType === 'prescription' ? (
                  <p style={{ margin: '8px 0', fontSize: '11px', color: '#b13026', fontWeight: 600 }}>
                    Optimizing document for fast, secure transfer…
                  </p>
                ) : prescriptionDoc ? (
                  <div style={{ marginTop: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: '#3f5646',
                        wordBreak: 'break-all',
                      }}
                    >
                      <FileText size={14} />
                      <span>{prescriptionDoc.filename}</span>
                    </div>
                    <small style={{ display: 'block', fontSize: '10px', color: '#3d8250', fontWeight: 600, marginTop: '3px' }}>
                      {formatFileSize(prescriptionDoc.size_bytes)} · Optimized & verified ✓
                    </small>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => prescriptionInputRef.current?.click()}
                        style={{
                          border: '1px solid #c0d8c6',
                          background: '#fff',
                          padding: '3px 8px',
                          fontSize: '10px',
                          borderRadius: '3px',
                          color: '#345e3d',
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrescriptionDoc(null)}
                        style={{
                          border: '1px solid #e5b9b4',
                          background: '#fff',
                          padding: '3px 8px',
                          fontSize: '10px',
                          borderRadius: '3px',
                          color: '#b13026',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '4px 0 10px', fontSize: '11px', color: '#887d74' }}>
                      Official doctor recommendation or prescription
                    </p>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ minHeight: '34px', fontSize: '11px', padding: '0 12px' }}
                      onClick={() => prescriptionInputRef.current?.click()}
                    >
                      <UploadCloud size={14} /> Choose File
                    </button>
                  </div>
                )}
              </div>

              {/* UPLOAD SECTION B: Admission Proof */}
              <div
                style={{
                  border: `1px ${admissionDoc ? 'solid #4d895f' : 'dashed #d4c6b8'}`,
                  background: admissionDoc ? '#f3faf4' : '#fcfaf6',
                  borderRadius: '4px',
                  padding: '16px',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={admissionInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(e, 'admission')}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                  {processingType === 'admission' ? (
                    <Loader2 size={20} className="animate-spin" color="#b13026" />
                  ) : admissionDoc ? (
                    <CheckCircle2 size={20} color="#3d8250" />
                  ) : (
                    <UploadCloud size={22} color="#b13026" />
                  )}
                  <strong style={{ fontSize: '13px', color: admissionDoc ? '#2e6b3f' : '#282421' }}>
                    Admission Proof
                  </strong>
                </div>

                {processingType === 'admission' ? (
                  <p style={{ margin: '8px 0', fontSize: '11px', color: '#b13026', fontWeight: 600 }}>
                    Optimizing document for fast, secure transfer…
                  </p>
                ) : admissionDoc ? (
                  <div style={{ marginTop: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: '#3f5646',
                        wordBreak: 'break-all',
                      }}
                    >
                      <FileText size={14} />
                      <span>{admissionDoc.filename}</span>
                    </div>
                    <small style={{ display: 'block', fontSize: '10px', color: '#3d8250', fontWeight: 600, marginTop: '3px' }}>
                      {formatFileSize(admissionDoc.size_bytes)} · Optimized & verified ✓
                    </small>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => admissionInputRef.current?.click()}
                        style={{
                          border: '1px solid #c0d8c6',
                          background: '#fff',
                          padding: '3px 8px',
                          fontSize: '10px',
                          borderRadius: '3px',
                          color: '#345e3d',
                        }}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmissionDoc(null)}
                        style={{
                          border: '1px solid #e5b9b4',
                          background: '#fff',
                          padding: '3px 8px',
                          fontSize: '10px',
                          borderRadius: '3px',
                          color: '#b13026',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '4px 0 10px', fontSize: '11px', color: '#887d74' }}>
                      Hospital record / inpatient admission card / ID
                    </p>
                    <button
                      type="button"
                      className="button button-secondary"
                      style={{ minHeight: '34px', fontSize: '11px', padding: '0 12px' }}
                      onClick={() => admissionInputRef.current?.click()}
                    >
                      <UploadCloud size={14} /> Choose File
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Message as specified in prompt */}
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                padding: '10px 12px',
                borderRadius: '4px',
                marginTop: '12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                color: '#9a3412',
                fontSize: '11px',
                lineHeight: 1.45,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Required: Both prescription and admission proof must be uploaded. All documents are verified before matching begins.
              </span>
            </div>
          </div>

          <label>
            Additional Medical Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Specific ward, bed number, or instructions for donors"
              rows={2}
            />
          </label>

          <button className="button button-primary full-width" type="submit" disabled={submitting}>
            {submitting ? 'Submitting & Uploading…' : 'SUBMIT EMERGENCY REQUEST →'}
          </button>
        </form>
      </div>
    </div>
  );
}

