export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  id: 'privacy' | 'terms';
  title: string;
  kicker: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_ENTITY = 'Ashir';
export const LEGAL_CONTACT_EMAIL = 'ashir.support.mail@gmail.com';
export const LEGAL_UPDATED = 'September 17, 2026';

export const PRIVACY_POLICY: LegalDocument = {
  id: 'privacy',
  title: 'PRIVACY POLICY',
  kicker: 'LEGAL',
  updated: LEGAL_UPDATED,
  intro:
    'This Privacy Policy explains what information Mars collects when you use the Mars mobile application and related services, why we collect it, who we share it with, and the choices you have. Mars is operated by ' +
    LEGAL_ENTITY +
    '.',
  sections: [
    {
      heading: 'Overview',
      paragraphs: [
        'Mars is a companion application that lets you pair and control your own desktop computer over a private connection, relay chat between paired devices, and make voluntary donations to support development.',
        'We collect only the information needed to provide these features, and we do not sell your personal data or use it for advertising.',
      ],
    },
    {
      heading: 'Information We Collect',
      paragraphs: ['We collect the following categories of information:'],
      bullets: [
        'Account information. When you sign in with Google, GitHub, or Apple we receive your name, email address, and profile photo. We never receive or store your password for those providers.',
        'Device and pairing data. Identifiers, names, and connection status of desktops you pair with Mars, stored to power the device hub.',
        'Chat data. Messages sent through the relay are transmitted between your paired devices. We process delivery metadata such as timestamps, sender, and recipient, but we do not use message content for any purpose other than delivery.',
        'Donation information. The amount, currency, transaction reference, email address, and time of each contribution.',
        'Diagnostic data. Basic technical information such as app version, device type, and error reports used to keep the app stable and secure.',
      ],
    },
    {
      heading: 'How We Use Information',
      paragraphs: ['We use the information we collect to:'],
      bullets: [
        'Sign you in and maintain your session.',
        'Pair your desktops and display their status.',
        'Relay chat between your paired devices.',
        'Process and verify donations, and maintain accounting records.',
        'Respond to your support and data requests.',
        'Detect, prevent, and address fraud, abuse, and security issues.',
        'Comply with legal and tax obligations.',
      ],
    },
    {
      heading: 'What We Do Not Collect',
      paragraphs: [
        'We do not receive or store your card number, CVV, or full payment credentials; card details are entered directly with our payment processor.',
        'We do not sell your personal data, and we do not use it for third-party advertising.',
      ],
    },
    {
      heading: 'How We Share Information',
      paragraphs: [
        'We share personal data only in the limited circumstances below:',
      ],
      bullets: [
        'Service providers. Google, GitHub, and Apple provide sign-in; Flutterwave processes payments; and our hosting and relay providers process data on our behalf. These providers are bound to use the data only to deliver their services.',
        'Legal reasons. We may disclose data if required by law, regulation, legal process, or to protect the rights, safety, and security of our users and the public.',
        'Business transfers. If Mars or ' +
          LEGAL_ENTITY +
          ' is involved in a merger, acquisition, or sale of assets, data may be transferred as part of that transaction, subject to this Policy.',
      ],
    },
    {
      heading: 'Data Retention',
      paragraphs: [
        'Donation records are retained for as long as necessary to satisfy accounting, tax, and legal requirements. Account and device data is retained while your account is active and for a reasonable period afterwards.',
        'When data is no longer needed, we delete or anonymise it.',
      ],
    },
    {
      heading: 'Security',
      paragraphs: [
        'Sign-in tokens are stored in your device\u2019s encrypted keystore rather than in plain storage. Payment secrets live only on our server and are never shipped inside the app. We use reasonable technical and organisational measures to protect your data, but no method of transmission or storage is completely secure.',
      ],
    },
    {
      heading: 'Your Rights and Choices',
      paragraphs: [
        'Depending on where you live, you may have the right to access, correct, delete, or restrict the processing of your personal data, and to object to certain processing or withdraw consent.',
        'You can request deletion of your data at any time using the contact details below. We will respond within the timeframe required by applicable law. You may also have the right to lodge a complaint with your local data protection authority, including the Nigeria Data Protection Commission.',
      ],
    },
    {
      heading: 'Children\u2019s Privacy',
      paragraphs: [
        'Mars is not directed to children under 13 (or the minimum age in your jurisdiction). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us so we can delete it.',
      ],
    },
    {
      heading: 'International Data Transfers',
      paragraphs: [
        'We and our service providers may process your data in countries other than your own. Where required, we take steps to ensure that such transfers are protected by appropriate safeguards.',
      ],
    },
    {
      heading: 'Changes to This Privacy Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. When we make material changes we will update the date above and, where appropriate, notify you in the app. Your continued use of Mars after an update means you accept the revised Policy.',
      ],
    },
    {
      heading: 'Contact Us',
      paragraphs: [
        'For privacy questions or requests, contact ' +
          LEGAL_ENTITY +
          ' at ' +
          LEGAL_CONTACT_EMAIL +
          '.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  id: 'terms',
  title: 'TERMS OF SERVICE',
  kicker: 'LEGAL',
  updated: LEGAL_UPDATED,
  intro:
    'These Terms of Service govern your access to and use of the Mars mobile application and related services provided by ' +
    LEGAL_ENTITY +
    '. By using Mars, you agree to these Terms.',
  sections: [
    {
      heading: 'Acceptance of These Terms',
      paragraphs: [
        'By downloading, accessing, or using Mars, you confirm that you have read, understood, and agree to be bound by these Terms and by our Privacy Policy. If you do not agree, do not use Mars.',
      ],
    },
    {
      heading: 'Eligibility',
      paragraphs: [
        'You must be at least 13 years old, or the minimum age of digital consent in your jurisdiction, to use Mars. If you use Mars on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms.',
      ],
    },
    {
      heading: 'Your Account',
      paragraphs: [
        'You sign in through a supported third-party provider. You are responsible for maintaining the security of your account and for all activity that occurs under it. Notify us promptly if you suspect unauthorised access.',
      ],
    },
    {
      heading: 'The Service',
      paragraphs: [
        'Mars lets you pair and control your own desktop computer over a private connection, relay chat between your paired devices, and make voluntary donations. Features may change, and we may suspend or discontinue parts of the Service at any time.',
      ],
    },
    {
      heading: 'Acceptable Use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Use Mars to break any law or infringe the rights of others.',
        'Access or attempt to access a device you do not own or control, or that you are not authorised to access.',
        'Interfere with, disrupt, or place undue load on the Service, our networks, or our providers.',
        'Reverse engineer, decompile, or attempt to extract source code except as permitted by law.',
        'Upload or transmit malware, or use Mars to send spam, harassment, or unlawful content.',
        'Misrepresent your identity or impersonate any person or organisation.',
      ],
    },
    {
      heading: 'Pairing and Device Security',
      paragraphs: [
        'Pairing a device grants control of that device to the paired client. You are solely responsible for deciding which devices you pair and for keeping your devices and credentials secure. Do not pair a device you are not authorised to control, and unpair devices you no longer trust.',
      ],
    },
    {
      heading: 'Donations and Payments',
      paragraphs: [
        'Donations are voluntary. Payments are processed by Flutterwave, and your use of that service may be subject to its own terms and privacy policy. Mars never receives or stores your full card details.',
        'Donations are generally non-refundable except where required by law. If you believe a charge was made in error, contact us promptly using the details below.',
      ],
    },
    {
      heading: 'Intellectual Property',
      paragraphs: [
        'Mars, including its name, logo, software, and content, is owned by ' +
          LEGAL_ENTITY +
          ' or its licensors and is protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable, revocable licence to use the app for your personal use, subject to these Terms.',
      ],
    },
    {
      heading: 'Third-Party Services and Links',
      paragraphs: [
        'Mars relies on third-party services such as Google, GitHub, Apple, and Flutterwave, and may link to third-party sites or resources. We do not control and are not responsible for third-party services, and their terms and privacy policies govern your use of them.',
      ],
    },
    {
      heading: 'Disclaimers',
      paragraphs: [
        'Mars is provided on an \u201cas is\u201d and \u201cas available\u201d basis. To the maximum extent permitted by law, we disclaim all warranties, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free.',
      ],
    },
    {
      heading: 'Limitation of Liability',
      paragraphs: [
        'To the maximum extent permitted by law, ' +
          LEGAL_ENTITY +
          ' will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising out of or relating to your use of Mars. Our total liability for any claim will not exceed the greater of the amount you paid us in the twelve months before the claim or the sum of one hundred US dollars.',
      ],
    },
    {
      heading: 'Indemnity',
      paragraphs: [
        'You agree to indemnify and hold harmless ' +
          LEGAL_ENTITY +
          ' from any claims, damages, liabilities, and expenses arising from your misuse of Mars or your breach of these Terms.',
      ],
    },
    {
      heading: 'Termination',
      paragraphs: [
        'We may suspend or terminate your access to Mars if you breach these Terms or if we discontinue the Service. You may stop using Mars at any time. Provisions that by their nature should survive termination, including intellectual property, disclaimers, and limitation of liability, will survive.',
      ],
    },
    {
      heading: 'Governing Law',
      paragraphs: [
        'These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict of law rules. The courts of Nigeria will have jurisdiction over any dispute arising from these Terms, unless mandatory local law provides otherwise.',
      ],
    },
    {
      heading: 'Changes to These Terms',
      paragraphs: [
        'We may update these Terms from time to time. When we make material changes we will update the date above and, where appropriate, notify you in the app. Your continued use of Mars after an update means you accept the revised Terms.',
      ],
    },
    {
      heading: 'Contact Us',
      paragraphs: [
        'For questions about these Terms, contact ' +
          LEGAL_ENTITY +
          ' at ' +
          LEGAL_CONTACT_EMAIL +
          '.',
      ],
    },
  ],
};
