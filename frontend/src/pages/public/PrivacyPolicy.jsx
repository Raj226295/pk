import { siteContact } from '../../data/siteData.js'

const collectedData = [
    'Name',
    'Mobile Number',
    'Email Address',
    'Business Documents',
    'GST & ITR Information',
    'Payment Details',
]

const serviceUses = [
    'GST Registration',
    'ITR Filing',
    'Udyam Registration',
    'Trade License',
    'Loan & Insurance Services',
    'Customer support and communication',
]

function PrivacyPolicy() {
    return (
        <div className="page-stack container">

            {/* ── Hero ── */}
            <section className="page-hero">
                <span className="eyebrow">Legal</span>
                <h1>Privacy Policy</h1>
                <p>
                    We respect your privacy and are committed to protecting your personal information.
                    This policy explains what we collect, how we use it, and how we keep it safe.
                </p>
                <p className="hero-meta">Last updated: May 29, 2026</p>
            </section>

            {/* ── Sections ── */}
            <section className="page-stack">

                {/* 1. Information we collect */}
                <article className="panel">
                    <h3>Information we collect</h3>
                    <p>When you use our services, we may collect the following personal information:</p>
                    <div className="privacy-tags">
                        {collectedData.map((item) => (
                            <span className="privacy-tag" key={item}>{item}</span>
                        ))}
                    </div>
                </article>

                {/* 2. How we use your information */}
                <article className="panel">
                    <h3>How we use your information</h3>
                    <p>Your information is used to deliver and support the following services:</p>
                    <ul className="privacy-list">
                        {serviceUses.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </article>

                {/* 3. Data security + Cookies — two columns */}
                <div className="split-section">
                    <article className="panel">
                        <h3>Data security</h3>
                        <p>
                            We keep all customer information secure and confidential using industry-standard
                            safeguards. Your data is never sold, rented, or shared with third parties for
                            commercial purposes.
                        </p>
                    </article>

                    <article className="panel">
                        <h3>Cookies</h3>
                        <p>
                            Our website may use cookies to improve performance and enhance your browsing
                            experience. You can disable cookies at any time through your browser settings
                            without affecting access to our services.
                        </p>
                    </article>
                </div>

                {/* 4. Your rights */}
                <article className="panel">
                    <h3>Your rights</h3>
                    <p>
                        You have the right to access, correct, or request deletion of the personal information
                        we hold about you. To exercise any of these rights, please contact us using the details
                        below and we will respond within a reasonable timeframe.
                    </p>
                </article>

                {/* 5. Changes to this policy */}
                <article className="panel">
                    <h3>Changes to this policy</h3>
                    <p>
                        We may update this Privacy Policy from time to time. When we do, we will revise the
                        &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review
                        this policy periodically to stay informed about how we protect your information.
                    </p>
                </article>

                {/* 6. Contact */}
                <article className="panel">
                    <h3>Contact us</h3>
                    <p>
                        If you have any questions or concerns about this Privacy Policy, please get in touch:
                    </p>
                    <p>{siteContact.address}</p>
                    <a className="text-link" href={`mailto:${siteContact.email}`}>
                        {siteContact.email}
                    </a>
                    <a className="text-link" href="tel:+916299484291">
                        +91 62994 84291
                    </a>
                    <a className="text-link" href="tel:+917280873845">
                        +91 72808 73845
                    </a>
                </article>

            </section>
        </div>
    )
}

export default PrivacyPolicy