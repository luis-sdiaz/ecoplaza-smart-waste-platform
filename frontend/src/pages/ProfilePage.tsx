import { CircleCheck, IdCard, Info, Leaf, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <section className="profile-page" aria-label={t("profile.title")}>
      <h1 className="profile-sr-only">{t("profile.title")}</h1>

      {user ? (
        <div className="profile-panel">
          <div className="profile-panel-grid">
            <article className="profile-hero" aria-labelledby="profile-user-name">
              <div className="profile-hero-cover">
                <span className="profile-brand">
                  <Leaf size={18} strokeWidth={1.8} aria-hidden="true" />
                  EcoPlaza
                </span>
              </div>

              <div className="profile-hero-content">
                <div className="profile-identity-bar">
                  <div className="profile-avatar-group">
                    <div className="profile-avatar" aria-hidden="true">
                      <UserRound strokeWidth={1.35} />
                    </div>
                    <span className="profile-demo-badge">{t("profile.demoAccount")}</span>
                  </div>

                  <span className="profile-active-badge">
                    <span aria-hidden="true" />
                    {t("profile.accountActive")}
                  </span>
                </div>

                <div className="profile-identity-text">
                  <h2 id="profile-user-name" title={user.name}>{user.name}</h2>
                  <p className="profile-account-type">
                    <span>{t("profile.accountType")}</span>
                    <strong>{t("profile.demo")}</strong>
                  </p>
                  <p className="profile-email" title={user.email}>
                    <Mail size={17} strokeWidth={1.7} aria-hidden="true" />
                    <span>{user.email}</span>
                  </p>
                </div>

                <p className="profile-demo-note">{t("profile.demoDescription")}</p>
              </div>
            </article>

            <aside className="profile-side-stack" aria-label={t("profile.profileSummary")}>
              <section className="profile-status-card" aria-labelledby="profile-status-heading">
                <header className="profile-card-heading">
                  <span className="profile-card-icon">
                    <ShieldCheck size={21} strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h2 id="profile-status-heading">{t("profile.accountInformation")}</h2>
                </header>

                <dl className="profile-account-grid">
                  <div className="profile-account-item">
                    <dt>{t("profile.accountType")}</dt>
                    <dd>{t("profile.demo")}</dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.status")}</dt>
                    <dd>{t("profile.active")}</dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.currentAccess")}</dt>
                    <dd>
                      <CircleCheck size={15} strokeWidth={2} aria-hidden="true" />
                      {t("profile.authenticated")}
                    </dd>
                  </div>
                  <div className="profile-account-item">
                    <dt>{t("profile.platform")}</dt>
                    <dd>EcoPlaza</dd>
                  </div>
                </dl>
              </section>

              <section className="profile-id-card" aria-labelledby="profile-id-heading">
                <IdCard className="profile-id-watermark" strokeWidth={0.85} aria-hidden="true" />
                <header className="profile-card-heading">
                  <span className="profile-card-icon">
                    <IdCard size={21} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h2 id="profile-id-heading">{t("profile.userIdentification")}</h2>
                </header>

                <dl className="profile-identifier-list">
                  <div className="profile-identifier-item">
                    <dt>{t("profile.id")}</dt>
                    <dd title={user.id}>{user.id}</dd>
                  </div>
                  <div className="profile-identifier-item">
                    <dt>{t("profile.associatedEmail")}</dt>
                    <dd title={user.email}>{user.email}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      ) : (
        <div className="profile-empty-state">
          <Info size={22} aria-hidden="true" />
          <p role="status">{t("profile.unavailable")}</p>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;
