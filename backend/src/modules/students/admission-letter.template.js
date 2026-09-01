/**
 * Admission Confirmation Letter — hardcoded letterhead template.
 *
 * No JSX here on purpose: the backend has no build/transpile step, so this
 * is written with plain React.createElement calls against
 * @react-pdf/renderer's component set. Layout/colors/copy are intentionally
 * fixed (per product decision — no per-batch or per-course design
 * variation); the only things that ever change are the 6 letterhead assets
 * (logo1/2/3, signature, stamp, director name — configured once in Settings)
 * and the small set of per-letter variables passed into renderAdmissionLetterPdf.
 */
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const e = React.createElement;

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Times-Roman', fontSize: 13, color: '#111111' },
  headerBox: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, marginBottom: 16 },
  // Extra horizontal inset for the body only — the header stays at the
  // page's own margin (36pt), the body gets more room on both sides.
  bodyContent: { paddingHorizontal: 32 },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  logoSlot: { height: 42, width: 150, alignItems: 'center', justifyContent: 'center' },
  logoImg: { height: 42, objectFit: 'contain' },
  logoPlaceholder: { height: 42, width: '100%', border: '1pt dashed #9CA3AF', alignItems: 'center', justifyContent: 'center' },
  logoPlaceholderText: { fontFamily: 'Helvetica', fontSize: 9, color: '#9CA3AF' },
  orgTitle: { fontFamily: 'Helvetica-Bold', fontSize: 17, color: '#1E3A8A', textAlign: 'center', marginBottom: 2 },
  programTitle: { fontFamily: 'Helvetica-Bold', fontSize: 15, color: '#B91C1C', textAlign: 'center', marginBottom: 6 },
  addressLine: { fontFamily: 'Helvetica', fontSize: 11, textAlign: 'center', color: '#111111' },
  contactLine: { fontFamily: 'Helvetica', fontSize: 11, textAlign: 'center', color: '#111111', marginBottom: 6 },
  rule: { borderBottomWidth: 2, borderBottomColor: '#000000', marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  bold: { fontFamily: 'Times-Bold' },
  toBlock: { marginBottom: 30, lineHeight: 1.4 },
  subject: { fontFamily: 'Times-Bold', marginBottom: 30 },
  paragraph: { marginBottom: 40, lineHeight: 1.5, textAlign: 'justify' },
  footer: { marginTop: 18 },
  signatureRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  signatureImg: { height: 40, width: 110, objectFit: 'contain' },
  stampImg: { height: 80, width: 80, objectFit: 'contain' },
  assetPlaceholder: { border: '1pt dashed #9CA3AF', alignItems: 'center', justifyContent: 'center' },
  assetPlaceholderText: { fontFamily: 'Helvetica', fontSize: 8, color: '#9CA3AF' },
});

// Every image slot degrades gracefully to a labeled dashed-border placeholder
// box when that asset hasn't been uploaded yet in Settings — the letterhead
// preview must always render something sensible, never throw.
const AssetOrPlaceholder = ({ src, label, style, placeholderStyle }) =>
  src
    ? e(Image, { src, style })
    : e(View, { style: [placeholderStyle || style, styles.assetPlaceholder] },
        e(Text, { style: styles.assetPlaceholderText }, label));

const Header = ({ assets }) =>
  e(View, { style: styles.headerBox, fixed: true },
    e(View, { style: styles.logoRow },
      e(View, { style: styles.logoSlot }, e(AssetOrPlaceholder, { src: assets.logo1, label: 'Logo 1', style: styles.logoImg, placeholderStyle: styles.logoPlaceholder })),
      e(View, { style: styles.logoSlot }, e(AssetOrPlaceholder, { src: assets.logo2, label: 'Logo 2', style: styles.logoImg, placeholderStyle: styles.logoPlaceholder })),
      e(View, { style: styles.logoSlot }, e(AssetOrPlaceholder, { src: assets.logo3, label: 'Logo 3', style: styles.logoImg, placeholderStyle: styles.logoPlaceholder })),
    ),
    e(Text, { style: styles.orgTitle }, 'Dr. D. Y. Patil Education and Research Foundation'),
    e(Text, { style: styles.programTitle }, 'Post-Doctoral Program'),
    e(Text, { style: styles.addressLine }, 'Dr. D.Y. Patil Educational Complex, Sector 29, Ravet Road, Akurdi, Pune - 411044.'),
    e(Text, { style: styles.contactLine }, 'Web: www.dyperf.in  |  Email: postdoc@dyperf.in'),
    e(View, { style: styles.rule }),
  );

/**
 * @param {object} vars
 * @param {string} vars.scholarName          "Dr. First Last" — already Dr.-prefixed
 * @param {string} vars.designation
 * @param {string} vars.organisation
 * @param {string} vars.organisationAddress
 * @param {string} vars.refNo                e.g. "POSTDOC26/J07/01"
 * @param {string} vars.dateLabel            e.g. "21/08/2026"
 * @param {string} vars.commencingLabel      e.g. "July 2026"
 * @param {object} assets                    { logo1, logo2, logo3, signature, stamp, directorName } — image values are data-URI strings or null/undefined
 * @returns {Promise<Buffer>}
 */
export const renderAdmissionLetterPdf = async (vars, assets = {}) => {
  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(Header, { assets }),

      e(View, { style: styles.bodyContent },
      e(View, { style: styles.metaRow },
        e(Text, null, e(Text, { style: styles.bold }, 'Ref. No.: '), vars.refNo),
        e(Text, null, e(Text, { style: styles.bold }, 'Date: '), vars.dateLabel),
      ),

      e(View, { style: styles.toBlock },
        e(Text, null, 'To,'),
        e(Text, null, vars.scholarName, ','),
        e(Text, null, vars.designation, ','),
        e(Text, null, vars.organisation, ','),
        e(Text, null, vars.organisationAddress),
      ),

      e(Text, { style: styles.subject }, 'Subject: Admission Confirmation Letter for the Postdoctoral Program.'),

      e(Text, { style: styles.paragraph },
        'Dear ', vars.scholarName, ',', '\n\n',
        'We are pleased to inform you that you have been officially admitted to the Postdoctoral Program in collaboration with Texas State University, USA, Dr. D. Y. Patil Education and Research Foundation, India and Dr. D. Y. Patil Institute of Management Studies, India. Your selection recognizes your outstanding academic achievements, research potential, and commitment to advancing knowledge in your field.'
      ),

      e(Text, { style: styles.paragraph },
        `The program is scheduled for a duration of two years, commencing ${vars.commencingLabel}. The details regarding your academic supervisor, industry guide, and international mentor, as well as confirmation of your research title, will be communicated to you shortly.`
      ),

      e(Text, { style: styles.paragraph },
        'During your postdoctoral tenure, it is essential that you maintain regular discussions with your academic supervisor and industry guide regarding your research progress. You are expected to submit progress reports every six months and complete all tasks assigned by the Postdoctoral Department in a timely and diligent manner. Furthermore, it is necessary to adhere to all guidelines and conditions issued by the Postdoctoral Research Center, as communicated from time to time.'
      ),

      e(Text, { style: styles.paragraph },
        'Congratulations once again on your admission. We look forward to your innovative contributions and active engagement in our academic community. Your participation will greatly enrich the research environment, and we are confident that this program will provide a strong foundation for your professional and scholarly growth.'
      ),

      e(Text, { style: styles.paragraph },
        'We are confident that your dedication and contributions will make a significant impact on the academic and research community, and we look forward to supporting your continued growth as a scholar.'
      ),

      e(View, { style: styles.footer, wrap: false },
        e(Text, null, 'Sincerely,'),
        e(View, { style: styles.signatureRow },
          e(AssetOrPlaceholder, { src: assets.signature, label: 'Signature', style: styles.signatureImg }),
          e(AssetOrPlaceholder, { src: assets.stamp, label: 'Stamp', style: styles.stampImg }),
        ),
        e(Text, { style: styles.bold }, assets.directorName || '[Director Name]'),
        e(Text, null, 'Director'),
        e(Text, null, 'Dr. D. Y. Patil Education and Research Foundation'),
      ),
      ),
    ),
  );

  return renderToBuffer(doc);
};
