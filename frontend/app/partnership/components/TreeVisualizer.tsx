'use client';
import React, { useState } from 'react';

// Simple recursive tree node
const TreeNode = ({ node }: { node: any }) => {
    const [expanded, setExpanded] = useState(true);

    if (!node) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '10px' }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    border: '2px solid',
                    borderColor: node.isActive ? '#4CAF50' : '#ccc',
                    borderRadius: '50%',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: node.isLevel5Closed ? '#FFD700' : '#fff',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 10
                }}
            >
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#000' }}>
                    <div>{node.tariff.substring(0, 1)}</div>
                    <div>L{node.level}</div>
                </div>
            </div>

            {/* Connector line */}
            {expanded && node.partners && node.partners.length > 0 && (
                <div style={{ display: 'flex', marginTop: '20px', position: 'relative' }}>
                    {/* Top vertical line from parent */}
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        width: '2px',
                        height: '20px',
                        backgroundColor: '#ccc',
                        transform: 'translateX(-50%)'
                    }}></div>

                    {node.partners.map((partner: any, index: number) => (
                        <div key={partner._id || index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Horizontal connector logic is tricky in plain flex without SVG, but this puts them side by side */}
                            <TreeNode node={partner} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const TreeVisualizer = ({ avatars }: { avatars: any[] }) => {
    return (
        <div style={{ overflowX: 'auto', padding: '20px', display: 'flex', gap: '50px' }}>
            {avatars.map((avatar) => (
                <div key={avatar._id}>
                    <h3 style={{ textAlign: 'center', color: '#fff' }}>Avatar {avatar._id.substring(0, 6)}...</h3>
                    <TreeNode node={avatar} />
                </div>
            ))}
        </div>
    );
};
