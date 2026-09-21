import { siteContact } from '../../data/siteData.js'

const liabilityExclusions = [
    'Government delays',
    'Incorrect documents submitted by clients',
    'Technical or server issues beyond our control',
]

function TermsAndConditions() {
    return (
        <div className="page-stack container">

            <section className="page-hero">
                <span className="eyebrow">Legal</span>
                <h1>Terms &amp; Conditions</h1>
                <p>
                    By using our website or services, you agree to the following terms and conditions.
                    Please read them carefully before proceeding.
                </p>
                <p className="hero-meta">Last updated: May 29, 2026</p>
            </section>

            <section className="page-stack">

                {/* Client Responsibility + Payment Terms */}
                <div className="split-section align-start">
                    <article className="panel">
                        <h3>Client responsibility</h3>
                        <p>
                            Clients must provide accurate information and valid documents for service processing.
                            PK Business Solution will not be held responsible for delays or rejections caused by
                            incorrect or incomplete information provided by the client.
                        </p>
                    </article>

                    <article className="panel">
                        <h3>Payment terms</h3>
                        <p>
                            Service charges must be paid before or during the processing of services. Work will
                            commence only after payment confirmation. Please refer to our{' '}
                            <a className="text-link" href="/refund-policy">Refund Policy</a> for details on
                            eligible refunds.
                        </p>
                    </article>
                </div>

                {/* Processing Time */}
                <article className="panel">
                    <h3>Processing time</h3>
                    <p>
                        Service timelines depend on government approval processes and document verification.
                        Estimated timelines provided are indicative only. PK Business Solution will keep you
                        informed of progress but cannot guarantee specific completion dates.
                    </p>
                </article>

                {/* Limitation of Liability */}
                <article className="panel">
                    <h3>Limitation of liability</h3>
                    <p>PK Business Solution is not responsible for delays or issues arising from:</p>
                    <ul className="privacy-list">
                        {liabilityExclusions.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </article>

                {/* Intellectual Property + Changes — two columns */}
                <div className="split-section align-start">
                    <article className="panel">
                        <h3>Intellectual property</h3>
                        <p>
                            All website content, logos, and branding belong exclusively to PK Business Solution.
                            Reproduction or use of any material without prior written permission is strictly
                            prohibited.
                        </p>
                    </article>

                    <article className="panel">
                        <h3>Changes to policies</h3>
                        <p>
                            We reserve the right to update these terms and any related policies at any time
                            without prior notice. Continued use of our website or services after changes are
                            published constitutes your acceptance of the revised terms.
                        </p>
                    </article>
                </div>

                {/* Contact */}
                <article className="panel">
                    <h3>Contact us</h3>
                    <p>
                        For any questions regarding these terms, please reach out to us:
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

export default TermsAndConditions