import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../lib/api.js'
import Loader from '../../components/common/Loader.jsx'
import NotFound from './NotFound.jsx'
import { Icon } from './Home.jsx'

export default function PublicService() {
  const { slug } = useParams(); const [state,setState]=useState({ loading:true, service:null, missing:false })
  useEffect(()=>{let active=true; api.get(`/api/public/services/${encodeURIComponent(slug)}`).then(({data})=>active&&setState({loading:false,service:data.service,missing:false})).catch((error)=>active&&setState({loading:false,service:null,missing:error.response?.status===404})); return()=>{active=false}},[slug])
  if(state.loading)return <Loader message="Loading service..."/>; if(state.missing)return <NotFound/>; const service=state.service; if(!service)return <div className="page-stack container"><section className="page-hero"><h1>We couldn’t load this service.</h1><p>Please try again shortly.</p></section></div>;
  if(!service.is_active)return <div className="page-stack container"><section className="page-hero"><span className="eyebrow">Coming soon</span><h1>{service.name} is being prepared for you.</h1><p>Our team is finalizing this service. Please contact us for early access or an alternative solution.</p><Link className="button button-primary" to="/contact">Talk to our team</Link></section></div>;
  return <div className="page-stack container"><section className="page-hero"><span className="eyebrow">{service.service_type}</span><h1>{service.name}</h1><p>{service.full_description || service.short_description}</p>{Number(service.price)>0&&<p><strong>Starting at ₹{Number(service.price).toLocaleString('en-IN')}</strong></p>}<Link className="button button-primary" to="/contact"><Icon name="calendar"/> Get started</Link></section></div>
}
