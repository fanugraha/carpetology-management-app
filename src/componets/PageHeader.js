import { useNavigate } from 'react-router-dom';

function PageHeader({ title, subtitle }) {
    const navigate = useNavigate();

    return (
        <div style={{
            background: 'linear-gradient(135deg, #1A2E35 0%, #0d2028 100%)',
            padding: '20px 20px 20px',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                maxWidth: 500,
                margin: '0 auto',
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#a0b8c0',
                        padding: '7px 12px',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                    }}
                >
                    ‹ Kembali
                </button>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{title}</div>
                    {subtitle && (
                        <div style={{ fontSize: 10, color: '#6B8894', marginTop: 1 }}>{subtitle}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PageHeader;