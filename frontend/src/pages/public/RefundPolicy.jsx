import { siteContact } from '../../data/siteData.js'

const refundConditions = [
    'Payment was made accidentally',
    'Duplicate payment occurred',
    'Service work has not started',
]

const nonRefundableServices = [
    'GST Registration',
    'ITR Filing',
    'Udyam Registration',
    'Trade License',
    'Project Reports',
    'Loan & Insurance Processing',
]

function RefundPolicy() {
    return (
        <div className="page-stack container">

            <section className="page-hero">
                <span className="eyebrow">Legal</span>
                <h1>Return &amp; Refund Policy</h1>
                <p>
                    We provide professional and digital services. Please read this policy carefully before
                    making a payment.
                </p>
                <p className="hero-meta">Last updated: May 29, 2026</p>
            </section>

            <section className="page-stack">

                {/* Service Policy */}
                <article className="panel">
                    <h3>Service policy</h3>
                    <p>
                        PK Business Solution provides professional and digital services. Once the service
                        process has started, returns are not applicable. We encourage you to reach out before
                        making a payment if you have any questions about a service.
                    </p>
                </article>

                {/* Refund Eligibility + Non-Refundable — two columns */}
                <div className="split-section align-start">
                    <article className="panel">
                        <h3>Refund eligibility</h3>
                        <p>A refund may be approved only if one of the following conditions is met:</p>
                        <ul className="privacy-list">
                            {refundConditions.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>

                    <article className="panel">
                        <h3>Non-refundable services</h3>
                        <p>Once processing has started, no refund will be provided for:</p>
                        <ul className="privacy-list">
                            {nonRefundableServices.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </article>
                </div>

                {/* Refund Processing */}
                <article className="panel">
                    <h3>Refund processing</h3>
                    <p>
                        Approved refunds will be processed within <strong>5–7 working days</strong> to the
                        original payment method. You will be notified once the refund has been initiated.
                    </p>
                </article>

                {/* Contact */}
                <article className="panel">
                    <h3>Contact us</h3>
                    <p>
                        To request a refund or for any questions about this policy, please contact us:
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

export default RefundPolicy