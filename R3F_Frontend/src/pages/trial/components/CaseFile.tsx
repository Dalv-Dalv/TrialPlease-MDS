import React, { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCaseGenerator } from '../../../store/case-generator-store/caseGeneratorContext';
import { useFlow } from '../../../store/flow-store/flowStore';

interface CaseTabletProps {
    deskPosition?: [number, number, number];
    deskRotation?: [number, number, number];
    onOpenChange?: (open: boolean) => void;
}

export const CaseTablet: React.FC<CaseTabletProps> = ({
    deskPosition = [0, 0.76, -1],
    deskRotation = [-Math.PI / 2, 0, 0],
    onOpenChange,
}) => {
    const { camera, controls } = useThree();
    const tabletRef = useRef<THREE.Group>(null);
    const uiContainerRef = useRef<HTMLDivElement>(null);

    const { caseInfo, isLoading, error, fetchCase } = useCaseGenerator();
    const transcript = useFlow((s) => s.transcript);
    const [isViewing, setIsViewing] = useState(false);
    // 0 = overview page; 1..N = evidence pages (one per item).
    const [pageIndex, setPageIndex] = useState(0);
    const evidenceCount = caseInfo?.evidence_items.length ?? 0;
    const totalPages = 1 + evidenceCount;
    const currentEvidence =
        pageIndex > 0 && caseInfo ? caseInfo.evidence_items[pageIndex - 1] : null;

    // Everything that belongs to the current evidence's debate (chronological):
    //   - evidence_argument with matching evidenceName
    //   - objection_ruling whose objection's target was such an argument
    // The standalone `objection` action is skipped — its ruling line already
    // encodes both the side that raised it and the reason.
    const evidenceArguments = currentEvidence
        ? transcript.filter((a) => {
              if (a.kind === 'evidence_argument') {
                  return a.evidenceName === currentEvidence.name;
              }
              if (a.kind === 'objection_ruling') {
                  const objection = transcript.find((t) => t.id === a.objectionId);
                  if (!objection || objection.kind !== 'objection') return false;
                  const target = transcript.find((t) => t.id === objection.targetId);
                  return (
                      target?.kind === 'evidence_argument' &&
                      target.evidenceName === currentEvidence.name
                  );
              }
              return false;
          })
        : [];

    const lastCloseTime = useRef<number>(0);

    const targetPos = new THREE.Vector3();
    const targetRot = new THREE.Quaternion();
    const initialPos = new THREE.Vector3(...deskPosition);
    const initialQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...deskRotation));

    // ==========================================
    // FIX: Comprehensive Event Shield
    // ==========================================
    useEffect(() => {
        const el = uiContainerRef.current;
        if (!el) return;

        // Stop all pointer events from bubbling up to the document
        const preventBleed = (e: Event) => e.stopPropagation();

        // Added up-events and double clicks so text selection is completely shielded
        const events = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click', 'dblclick'];

        events.forEach(ev => el.addEventListener(ev, preventBleed));
        return () => {
            events.forEach(ev => el.removeEventListener(ev, preventBleed));
        };
    }, [isViewing]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isViewing) return;
            if (e.key === 'Tab' || e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isViewing]);

    const handleTabletClick = (e: any) => {
        e.stopPropagation();
        if (isViewing) return;
        if (Date.now() - lastCloseTime.current < 500) return;
        setIsViewing(true);
        setPageIndex(0);
        onOpenChange?.(true);
        if (!caseInfo && !isLoading) fetchCase();
        setTimeout(() => {
            if (controls && typeof (controls as any).unlock === 'function') {
                (controls as any).unlock();
            } else {
                document.exitPointerLock();
            }
        }, 10);
    };

    const handleClose = () => {
        setIsViewing(false);
        onOpenChange?.(false);
        lastCloseTime.current = Date.now();
        setTimeout(() => {
            if (controls && typeof (controls as any).lock === 'function') {
                (controls as any).lock();
            }
        }, 50);
    };

    useFrame((_state, delta) => {
        if (!tabletRef.current) return;
        if (isViewing) {
            targetPos.set(0, 0, -0.18).applyMatrix4(camera.matrixWorld);
            targetRot.copy(camera.quaternion);
        } else {
            targetPos.copy(initialPos);
            targetRot.copy(initialQuat);
        }
        tabletRef.current.position.lerp(targetPos, 10 * delta);
        tabletRef.current.quaternion.slerp(targetRot, 10 * delta);
    });

    return (
        <group>
            {isViewing && (
                <Html fullscreen zIndexRange={[10, 0]}>
                    <div
                        style={{ width: '100vw', height: '100vh', cursor: 'pointer' }}
                        // FIX: Changed from onClick to onPointerDown. 
                        // This prevents text-selection drags from accidentally closing the tablet!
                        onPointerDown={(e) => { e.stopPropagation(); handleClose(); }}
                    />
                </Html>
            )}

            <group ref={tabletRef} onClick={handleTabletClick} scale={0.3}>
                <RoundedBox args={[0.85, 1.17, 0.04]} radius={0.02} smoothness={4}>
                    <meshStandardMaterial color="#0a0a0f" roughness={0.5} metalness={0.6} />
                </RoundedBox>

                <mesh position={[0, 0, 0.021]}>
                    <planeGeometry args={[0.8, 1.12]} />
                    <meshBasicMaterial color={isViewing ? "#0d1117" : "#010106"} />
                </mesh>

                {isViewing && (
                    <Html
                        transform
                        scale={0.0385}
                        position={[0, 0, 0.022]}
                        zIndexRange={[100, 20]}
                    >
                        <style>{`
                            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

                            @keyframes spin { to { transform: rotate(360deg); } }
                            @keyframes fadeUp {
                                from { opacity: 0; transform: translateY(14px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }

                            .section-reveal { animation: fadeUp 0.45s ease-out both; }
                            .section-reveal:nth-child(1) { animation-delay: 0.05s; }
                            .section-reveal:nth-child(2) { animation-delay: 0.15s; }
                            .section-reveal:nth-child(3) { animation-delay: 0.25s; }
                            .section-reveal:nth-child(4) { animation-delay: 0.35s; }

                            .close-btn:hover { background: #c9a227 !important; }
                            .retry-btn:hover { background: rgba(212,175,55,0.1) !important; }
                            .nav-arrow:not(:disabled):hover {
                                background: rgba(212,175,55,0.12) !important;
                                border-color: rgba(212,175,55,0.6) !important;
                            }

                            .doc-scroll::-webkit-scrollbar { width: 5px; }
                            .doc-scroll::-webkit-scrollbar-track { background: #111620; }
                            .doc-scroll::-webkit-scrollbar-thumb { background: #3a3020; border-radius: 3px; }
                        `}</style>

                        {/* FIX: Explicitly stopping synthetic propagation as well for bulletproof safety */}
                        <div
                            ref={uiContainerRef}
                            style={styles.document}
                            onPointerDown={e => e.stopPropagation()}
                            onPointerUp={e => e.stopPropagation()}
                            onClick={e => e.stopPropagation()}
                            onDoubleClick={e => e.stopPropagation()}
                        >

                            {/* ── HEADER ── */}
                            <div style={styles.header}>
                                <div style={styles.doubleRule}>
                                    <div style={styles.ruleThick} />
                                    <div style={styles.ruleThin} />
                                </div>

                                <span style={styles.sealIcon}>⚖</span>
                                <h1 style={styles.courtName}>OFFICIAL CASE DOCKET</h1>
                                <p style={styles.docketSubtitle}>COURTROOM ONLY REFERENCE</p>

                                <div style={{ ...styles.doubleRule, flexDirection: 'column-reverse' }}>
                                    <div style={styles.ruleThick} />
                                    <div style={styles.ruleThin} />
                                </div>
                            </div>

                            {/* ── CONTENT ── */}
                            <div className="doc-scroll" style={styles.content}>

                                {isLoading && (
                                    <div style={styles.centerContainer}>
                                        <div style={styles.spinner} />
                                        <p style={styles.loadingTitle}>ACCESSING GALACTIC ARCHIVES</p>
                                        <p style={styles.loadingSubtitle}>Compiling case data…</p>
                                    </div>
                                )}

                                {error && !isLoading && (
                                    <div style={styles.centerContainer}>
                                        <p style={styles.errorIcon}>⚠</p>
                                        <p style={styles.errorTitle}>CONNECTION SEVERED</p>
                                        <p style={styles.errorBody}>{error}</p>
                                        <button className="retry-btn" onClick={fetchCase} style={styles.retryBtn}>
                                            ↺  RETRY CONNECTION
                                        </button>
                                    </div>
                                )}

                                {caseInfo && !isLoading && pageIndex === 0 && (
                                    <div style={styles.caseContainer}>

                                        {/* Caption Box */}
                                        <div className="section-reveal" style={styles.captionBox}>
                                            <div style={styles.partiesStack}>
                                                <div style={styles.partyGroup}>
                                                    <span style={styles.partyTag}>PLAINTIFF / VICTIM</span>
                                                    <h2 style={styles.partyName}>{caseInfo.victim.split(':')[0]}</h2>
                                                </div>
                                                <div style={styles.versusRow}>
                                                    <div style={styles.versusLine} />
                                                    <span style={styles.versusText}>versus</span>
                                                    <div style={styles.versusLine} />
                                                </div>
                                                <div style={styles.partyGroup}>
                                                    <span style={styles.partyTag}>DEFENDANT</span>
                                                    <h2 style={styles.partyName}>{caseInfo.defendant.split(':')[0]}</h2>
                                                </div>
                                            </div>

                                            <div style={styles.metaDataSide}>
                                                <div style={styles.metaItem}>
                                                    <p style={styles.metaLabel}>CASE TITLE</p>
                                                    <p style={styles.metaValue}>{caseInfo.case_name}</p>
                                                </div>
                                                <div style={styles.metaHRule} />
                                                <div style={styles.metaItem}>
                                                    <p style={styles.metaLabel}>DESIGNATION</p>
                                                    <p style={styles.metaValue}>{caseInfo.case_type.toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section I */}
                                        <div className="section-reveal" style={styles.section}>
                                            <div style={styles.sectionHeader}>
                                                <span style={styles.sectionRoman}>I.</span>
                                                <h3 style={styles.sectionTitle}>FACTUAL SUMMARY</h3>
                                            </div>
                                            <div style={styles.sectionRule} />
                                            <p style={styles.paragraph}>{caseInfo.case_description}</p>
                                        </div>

                                        {/* Section II */}
                                        <div className="section-reveal" style={styles.section}>
                                            <div style={styles.sectionHeader}>
                                                <span style={styles.sectionRoman}>II.</span>
                                                <h3 style={styles.sectionTitle}>THE DEFENDANT</h3>
                                            </div>
                                            <div style={styles.sectionRule} />
                                            <p style={styles.paragraph}>{caseInfo.defendant}</p>
                                        </div>

                                        {/* Section III */}
                                        <div className="section-reveal" style={styles.section}>
                                            <div style={styles.sectionHeader}>
                                                <span style={styles.sectionRoman}>III.</span>
                                                <h3 style={styles.sectionTitle}>THE PLAINTIFF</h3>
                                            </div>
                                            <div style={styles.sectionRule} />
                                            <p style={styles.paragraph}>{caseInfo.victim}</p>
                                        </div>

                                    </div>
                                )}

                                {caseInfo && !isLoading && currentEvidence && (
                                    <div style={styles.caseContainer}>
                                        <div className="section-reveal" style={styles.captionBox}>
                                            <div style={styles.partiesStack}>
                                                <div style={styles.partyGroup}>
                                                    <span style={styles.partyTag}>
                                                        EVIDENCE {pageIndex} OF {evidenceCount}
                                                    </span>
                                                    <h2 style={styles.partyName}>{currentEvidence.name}</h2>
                                                </div>
                                            </div>
                                            <div style={styles.metaDataSide}>
                                                <div style={styles.metaItem}>
                                                    <p style={styles.metaLabel}>CASE TITLE</p>
                                                    <p style={styles.metaValue}>{caseInfo.case_name}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="section-reveal" style={styles.section}>
                                            <div style={styles.sectionHeader}>
                                                <span style={styles.sectionRoman}>§</span>
                                                <h3 style={styles.sectionTitle}>EVIDENCE DESCRIPTION</h3>
                                            </div>
                                            <div style={styles.sectionRule} />
                                            <p style={styles.paragraph}>{currentEvidence.description}</p>
                                        </div>

                                        {evidenceArguments.length > 0 && (
                                            <div className="section-reveal" style={styles.section}>
                                                <div style={styles.sectionHeader}>
                                                    <span style={styles.sectionRoman}>¶</span>
                                                    <h3 style={styles.sectionTitle}>RECORD OF ARGUMENT</h3>
                                                </div>
                                                <div style={styles.sectionRule} />
                                                <div style={styles.chatLog}>
                                                    {evidenceArguments.map((entry) => {
                                                        if (entry.kind === 'evidence_argument') {
                                                            const isDefense = entry.side === 'defense'
                                                            return (
                                                                <div
                                                                    key={entry.id}
                                                                    style={{
                                                                        ...styles.chatItem,
                                                                        alignSelf: isDefense ? 'flex-end' : 'flex-start',
                                                                        alignItems: isDefense ? 'flex-end' : 'flex-start',
                                                                        textAlign: isDefense ? 'right' : 'left',
                                                                    }}
                                                                >
                                                                    <span style={styles.chatTag}>
                                                                        {isDefense ? 'DEFENSE' : 'PROSECUTION'}
                                                                    </span>
                                                                    <div
                                                                        style={{
                                                                            ...styles.chatBubble,
                                                                            ...(isDefense ? styles.chatBubbleDefense : styles.chatBubbleProsecution),
                                                                        }}
                                                                    >
                                                                        {entry.text}
                                                                    </div>
                                                                </div>
                                                            )
                                                        }
                                                        if (entry.kind === 'objection_ruling') {
                                                            const objection = transcript.find((t) => t.id === entry.objectionId)
                                                            if (!objection || objection.kind !== 'objection') return null
                                                            const sideLabel = objection.side === 'prosecution' ? 'Prosecution' : 'Defense'
                                                            const rulingLabel = entry.ruling === 'sustained' ? 'SUSTAINED' : 'OVERRULED'
                                                            return (
                                                                <div key={entry.id} style={styles.chatRuling}>
                                                                    <span style={styles.chatRulingTag}>OBJECTION {rulingLabel}</span>
                                                                    <span style={styles.chatRulingDetail}>
                                                                        Called by {sideLabel} · {objection.reason}
                                                                    </span>
                                                                </div>
                                                            )
                                                        }
                                                        return null
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── FOOTER ── */}
                            <div style={styles.footer}>
                                <div style={styles.doubleRule}>
                                    <div style={styles.ruleThick} />
                                    <div style={styles.ruleThin} />
                                </div>
                                <div style={styles.footerInner}>
                                    <button
                                        type="button"
                                        className="nav-arrow"
                                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                        disabled={pageIndex === 0}
                                        style={{
                                            ...styles.navArrow,
                                            ...(pageIndex === 0 ? styles.navArrowDisabled : {}),
                                        }}
                                        aria-label="Previous page"
                                    >
                                        ‹
                                    </button>

                                    <div style={styles.footerCenter}>
                                        <p style={styles.footerHint}>
                                            Press <span style={styles.footerKey}>TAB</span> or <span style={styles.footerKey}>ESC</span> · click outside to dismiss
                                        </p>
                                        {totalPages > 1 && (
                                            <p style={styles.pageIndicator}>
                                                {pageIndex === 0
                                                    ? `Overview · 1 / ${totalPages}`
                                                    : `Evidence ${pageIndex} · ${pageIndex + 1} / ${totalPages}`}
                                            </p>
                                        )}
                                        <button className="close-btn" onClick={handleClose} style={styles.closeBtn}>
                                            CLOSE FILE
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="nav-arrow"
                                        onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={pageIndex >= totalPages - 1}
                                        style={{
                                            ...styles.navArrow,
                                            ...(pageIndex >= totalPages - 1 ? styles.navArrowDisabled : {}),
                                        }}
                                        aria-label="Next page"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                        </div>
                    </Html>
                )}
            </group>
        </group>
    );
};

// ─────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────
const GOLD = '#d4af37';
const GOLD_MID = 'rgba(212,175,55,0.30)';
const GOLD_DIM = 'rgba(212,175,55,0.15)';
const BG = '#0d1117';
const BG2 = '#111620';
const TEXT = '#e8e4d8';
const TEXT_DIM = '#7a7670';
const TEXT_BODY = '#c4c0b4';

// Sizes scaled ×1.3 from previous version
const styles: { [key: string]: React.CSSProperties } = {

    document: {
        width: '858px',
        height: '1188px',
        background: BG,
        color: TEXT,
        fontFamily: '"Crimson Pro", Georgia, serif',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'auto',
        border: `1px solid ${GOLD_MID}`,
    },

    // HEADER
    header: {
        padding: '52px 85px 0px 85px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
    },
    doubleRule: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    ruleThick: {
        width: '100%',
        height: '2px',
        background: GOLD_MID,
    },
    ruleThin: {
        width: '100%',
        height: '1px',
        background: GOLD_DIM,
    },
    sealIcon: {
        fontSize: '40px',
        color: GOLD,
        opacity: 0.7,
        lineHeight: 1,
        marginTop: '4px',
    },
    courtName: {
        margin: 0,
        fontSize: '38px',
        letterSpacing: '5px',
        fontWeight: '700',
        fontFamily: '"Cinzel", Georgia, serif',
        color: TEXT,
    },
    docketSubtitle: {
        margin: 0,
        fontSize: '13px',
        letterSpacing: '7px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.65,
        marginBottom: '4px',
    },

    // CONTENT
    content: {
        flex: 1,
        padding: '10px 85px 36px 85px',
        overflowY: 'auto',
    },
    centerContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        gap: '18px',
        paddingBottom: '52px',
    },

    // LOADING
    spinner: {
        width: '52px',
        height: '52px',
        border: `2px solid ${GOLD_DIM}`,
        borderTopColor: GOLD,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingTitle: {
        margin: 0,
        fontSize: '17px',
        letterSpacing: '4px',
        fontFamily: '"Cinzel", serif',
        color: TEXT,
        fontWeight: '600',
    },
    loadingSubtitle: {
        margin: 0,
        fontSize: '20px',
        color: TEXT_DIM,
        fontStyle: 'italic',
    },

    // ERROR
    errorIcon: {
        margin: 0,
        fontSize: '48px',
        color: '#c0392b',
    },
    errorTitle: {
        margin: 0,
        fontSize: '18px',
        letterSpacing: '3px',
        fontFamily: '"Cinzel", serif',
        color: '#e74c3c',
    },
    errorBody: {
        margin: 0,
        fontSize: '21px',
        color: TEXT_DIM,
        fontStyle: 'italic',
    },
    retryBtn: {
        padding: '14px 36px',
        background: 'transparent',
        color: GOLD,
        fontSize: '15px',
        letterSpacing: '2px',
        fontFamily: '"Cinzel", serif',
        border: `1px solid ${GOLD_MID}`,
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'background 0.2s',
    },

    // CASE CONTENT
    caseContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '46px',
        paddingTop: '26px',
    },

    // CAPTION BOX
    captionBox: {
        border: `1px solid ${GOLD_MID}`,
        borderRadius: '4px',
        overflow: 'hidden',
        background: BG2,
        display: 'flex',
        flexDirection: 'row',
    },
    partiesStack: {
        flex: 1,
        padding: '34px 42px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRight: `1px solid ${GOLD_DIM}`,
    },
    partyGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    partyTag: {
        fontSize: '11px',
        letterSpacing: '3px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.65,
    },
    partyName: {
        margin: 0,
        fontSize: '30px',
        fontWeight: '600',
        fontFamily: '"Cinzel", serif',
        color: TEXT,
        letterSpacing: '1px',
        lineHeight: 1.2,
    },
    versusRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        margin: '20px 0',
    },
    versusLine: {
        flex: 1,
        height: '1px',
        background: GOLD_DIM,
    },
    versusText: {
        fontSize: '17px',
        fontStyle: 'italic',
        color: TEXT_DIM,
        letterSpacing: '2px',
        flexShrink: 0,
    },
    metaDataSide: {
        flex: 1,
        padding: '34px 42px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    metaItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
    },
    metaHRule: {
        height: '1px',
        background: GOLD_DIM,
        margin: '20px 0',
    },
    metaLabel: {
        margin: 0,
        fontSize: '11px',
        letterSpacing: '3px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.65,
    },
    metaValue: {
        margin: 0,
        fontSize: '25px',
        fontWeight: '600',
        color: TEXT,
        lineHeight: 1.3,
        fontFamily: '"Cinzel", serif',
    },

    // SECTIONS
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    sectionHeader: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '16px',
    },
    sectionRoman: {
        fontSize: '16px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.75,
        flexShrink: 0,
        letterSpacing: '1px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '14px',
        fontFamily: '"Cinzel", serif',
        fontWeight: '700',
        letterSpacing: '4px',
        color: TEXT_DIM,
    },
    sectionRule: {
        height: '1px',
        background: GOLD_DIM,
    },
    paragraph: {
        margin: 0,
        fontSize: '24px',
        lineHeight: 1.78,
        textAlign: 'justify',
        color: TEXT_BODY,
        fontWeight: 300,
    },

    // FOOTER
    footer: {
        padding: '0 85px 36px 85px',
    },
    footerInner: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '22px',
    },
    footerHint: {
        margin: 0,
        fontSize: '17px',
        color: TEXT_DIM,
        fontStyle: 'italic',
    },
    footerKey: {
        fontStyle: 'normal',
        fontFamily: '"Cinzel", serif',
        fontSize: '13px',
        color: GOLD,
        background: GOLD_DIM,
        border: `1px solid ${GOLD_MID}`,
        borderRadius: '3px',
        padding: '2px 8px',
        letterSpacing: '1px',
    },
    closeBtn: {
        padding: '16px 44px',
        background: GOLD,
        color: '#0d1117',
        fontSize: '14px',
        fontWeight: '700',
        fontFamily: '"Cinzel", serif',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        letterSpacing: '3px',
        transition: 'background 0.2s',
    },

    // PAGE NAVIGATION
    footerCenter: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    pageIndicator: {
        margin: 0,
        fontSize: '12px',
        letterSpacing: '3px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.65,
    },
    navArrow: {
        width: '64px',
        height: '64px',
        background: 'transparent',
        color: GOLD,
        fontSize: '40px',
        lineHeight: 1,
        fontFamily: '"Cinzel", serif',
        border: `1px solid ${GOLD_MID}`,
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s, color 0.2s',
    },
    navArrowDisabled: {
        opacity: 0.25,
        cursor: 'not-allowed',
        borderColor: GOLD_DIM,
    },

    // CHAT-STYLE EVIDENCE LOG
    chatLog: {
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        marginTop: '10px',
    },
    chatItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: '78%',
    },
    chatTag: {
        fontSize: '11px',
        letterSpacing: '3px',
        color: GOLD,
        fontFamily: '"Cinzel", serif',
        opacity: 0.7,
    },
    chatBubble: {
        padding: '14px 20px',
        borderRadius: '14px',
        fontSize: '19px',
        lineHeight: 1.6,
        color: TEXT_BODY,
        fontFamily: '"Crimson Pro", Georgia, serif',
        fontWeight: 300,
        border: `1px solid ${GOLD_DIM}`,
        background: BG2,
    },
    chatBubbleProsecution: {
        borderTopLeftRadius: '4px',
    },
    chatBubbleDefense: {
        borderTopRightRadius: '4px',
        background: 'rgba(212,175,55,0.06)',
    },
    chatRuling: {
        alignSelf: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 28px',
        margin: '4px 0',
        borderTop: `1px dashed ${GOLD_DIM}`,
        borderBottom: `1px dashed ${GOLD_DIM}`,
        background: 'rgba(212,175,55,0.04)',
        minWidth: '60%',
        maxWidth: '85%',
    },
    chatRulingTag: {
        fontSize: '13px',
        letterSpacing: '4px',
        fontFamily: '"Cinzel", serif',
        color: GOLD,
        fontWeight: 700,
    },
    chatRulingDetail: {
        fontSize: '13px',
        letterSpacing: '2px',
        fontFamily: '"Cinzel", serif',
        color: TEXT_DIM,
        textTransform: 'capitalize',
    },
};