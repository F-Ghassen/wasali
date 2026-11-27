export const colors = {
  black: '#000000',
  white: '#ffffff',
  bodyText: '#545454',
  muted: '#adadad',
  border: '#e5e5e5',
  background: '#f6f6f6',
  accentGreen: '#22c55e',
};

export const bodyStyle = {
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  backgroundColor: colors.background,
  margin: 0,
  padding: '32px 16px',
};

export const containerStyle = {
  maxWidth: '480px',
  margin: '0 auto',
  backgroundColor: colors.white,
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,.08)',
};

export const headerStyle = {
  backgroundColor: colors.black,
  padding: '24px 32px',
};

export const logoStyle = {
  color: colors.white,
  fontSize: '22px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
};

export const contentStyle = {
  padding: '32px',
};

export const greetingStyle = {
  margin: '0 0 8px',
  fontSize: '16px',
  color: colors.bodyText,
};

export const headlineStyle = {
  margin: '0 0 16px',
  fontSize: '20px',
  fontWeight: 700,
  color: colors.black,
};

export const bodyTextStyle = {
  margin: '0 0 24px',
  fontSize: '14px',
  color: colors.bodyText,
};

export const buttonStyle = {
  display: 'inline-block',
  backgroundColor: colors.black,
  color: colors.white,
  padding: '12px 28px',
  borderRadius: '100px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
};

export const footerStyle = {
  padding: '16px 32px',
  borderTop: `1px solid ${colors.border}`,
};

export const footerTextStyle = {
  margin: 0,
  fontSize: '12px',
  color: colors.muted,
};
