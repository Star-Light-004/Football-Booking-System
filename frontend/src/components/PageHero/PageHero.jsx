import React from "react";
import { Link } from "react-router-dom";
import "./PageHero.css";

const PageHero = ({ breadcrumb = [], eyebrow, title, description, action }) => (
  <section className="app-page-hero">
    <div className="app-page-hero__inner">
      <nav className="app-page-hero__breadcrumb" aria-label="Đường dẫn">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span className="app-page-hero__separator">›</span>}
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span className="app-page-hero__current" aria-current="page">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
      <div className="app-page-hero__body">
        <div className="app-page-hero__copy">
          {eyebrow && <p className="app-page-hero__eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="app-page-hero__description">{description}</p>}
        </div>
        {action && <div className="app-page-hero__action">{action}</div>}
      </div>
    </div>
  </section>
);

export default PageHero;