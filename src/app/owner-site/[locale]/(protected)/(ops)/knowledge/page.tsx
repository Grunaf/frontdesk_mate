import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getStaffKnowledgeSnapshot } from '@/entities/staff-knowledge/server';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  buildBootstrapQuestionnairePrefill,
  isStaffKnowledgeAiConfiguredAction,
  StaffKnowledgePanel,
  type StaffKnowledgePanelLabels,
} from '@/features/owner-staff-knowledge';
import { getOwnerDashboardFrameClasses } from '@/features/owner-shell';

interface OwnerKnowledgePageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerKnowledgePage({ params }: OwnerKnowledgePageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.knowledge');
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const [snapshot, tenant, aiConfigured] = await Promise.all([
    getStaffKnowledgeSnapshot(context.slug),
    getTenantRecord(context.slug),
    isStaffKnowledgeAiConfiguredAction(),
  ]);

  const { questionnaire, fromSettings } = buildBootstrapQuestionnairePrefill(
    tenant?.settings
  );

  const labels: StaffKnowledgePanelLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    tabBootstrap: t('tabs.bootstrap'),
    tabRoles: t('tabs.roles'),
    tabArticles: t('tabs.articles'),
    modeAuto: t('bootstrap.modeAuto'),
    modeManual: t('bootstrap.modeManual'),
    modeAriaLabel: t('bootstrap.modeAriaLabel'),
    advancedPaste: t('bootstrap.advancedPaste'),
    checkReadiness: t('bootstrap.checkReadiness'),
    updateReadiness: t('bootstrap.updateReadiness'),
    checkingReadiness: t('bootstrap.checkingReadiness'),
    readinessTitle: t('bootstrap.readinessTitle'),
    readinessStale: t('bootstrap.readinessStale'),
    resetCycle: t('bootstrap.resetCycle'),
    mustUse: t('bootstrap.mustUse'),
    missing: t('bootstrap.missing'),
    unclear: t('bootstrap.unclear'),
    followUp: t('bootstrap.followUp'),
    followUpAnswerPlaceholder: t('bootstrap.followUpAnswerPlaceholder'),
    answeredClarifications: t('bootstrap.answeredClarifications'),
    readyGreen: t('bootstrap.readyGreen'),
    readyYellow: t('bootstrap.readyYellow'),
    readyRed: t('bootstrap.readyRed'),
    generateYellowHint: t('bootstrap.generateYellowHint'),
    otherNotesIncomplete: t('bootstrap.otherNotesIncomplete'),
    generateStructure: t('bootstrap.generateStructure'),
    pipelineProgress: t('bootstrap.pipelineProgress'),
    laborTypeLabel: t('roles.laborType'),
    copyPrompt: t('ai.copyPrompt'),
    promptCopied: t('ai.promptCopied'),
    generateWithAi: t('ai.generateWithAi'),
    generating: t('ai.generating'),
    pasteReplyLabel: t('ai.pasteReplyLabel'),
    pasteReplyHint: t('ai.pasteReplyHint'),
    preview: t('ai.preview'),
    applyReplace: t('bootstrap.applyReplace'),
    applyImport: t('articles.applyImport'),
    applying: t('ai.applying'),
    emptyRoles: t('roles.empty'),
    emptyArticles: t('articles.empty'),
    headcount: t('roles.headcount'),
    checklistTitle: t('roles.checklistTitle'),
    deleteRole: t('roles.delete'),
    deleteArticle: t('articles.delete'),
    articleTitleLabel: t('articles.titleLabel'),
    articleBodyLabel: t('articles.bodyLabel'),
    articleVideoUrlLabel: t('articles.videoUrlLabel'),
    articleRoleLabel: t('articles.roleLabel'),
    articleRoleNone: t('articles.roleNone'),
    addArticle: t('articles.addManual'),
    articleAiTopicLabel: t('articles.aiTopicLabel'),
    saveManual: t('articles.saveManual'),
    readOnly: t('readOnly'),
    errorUnauthorized: t('errors.unauthorized'),
    errorForbidden: t('errors.forbidden'),
    errorInvalid: t('errors.invalid'),
    errorWrite: t('errors.write'),
    errorNotFound: t('errors.notFound'),
    errorNotConfigured: t('errors.notConfigured'),
    errorRateLimited: t('errors.rateLimited'),
    errorProvider: t('errors.provider'),
    errorInvalidInput: t('errors.invalidInput'),
    errorNotReady: t('errors.notReady'),
    parseOkRoles: t('bootstrap.parseOk'),
    parseOkArticle: t('articles.parseOk'),
    confirmReplace: t('bootstrap.confirmReplace'),
    questionnaire: {
      fromSettings: t('bootstrap.questionnaire.fromSettings'),
      openSettingsContacts: t('bootstrap.questionnaire.openSettingsContacts'),
      openSettingsGuestApp: t('bootstrap.questionnaire.openSettingsGuestApp'),
      checkInTime: t('bootstrap.questionnaire.checkInTime'),
      checkOutTime: t('bootstrap.questionnaire.checkOutTime'),
      receptionOpen: t('bootstrap.questionnaire.receptionOpen'),
      receptionClose: t('bootstrap.questionnaire.receptionClose'),
      receptionHint: t('bootstrap.questionnaire.receptionHint'),
      sizeUnknown: t('bootstrap.questionnaire.sizeUnknown'),
      roomCount: t('bootstrap.questionnaire.roomCount'),
      bedCount: t('bootstrap.questionnaire.bedCount'),
      laundry: t('bootstrap.questionnaire.laundry'),
      quietHours: t('bootstrap.questionnaire.quietHours'),
      laborModel: t('bootstrap.questionnaire.laborModel'),
      laborPaid: t('bootstrap.questionnaire.laborPaid'),
      laborVolunteers: t('bootstrap.questionnaire.laborVolunteers'),
      laborMix: t('bootstrap.questionnaire.laborMix'),
      nightCoverage: t('bootstrap.questionnaire.nightCoverage'),
      nightStaff: t('bootstrap.questionnaire.nightStaff'),
      nightVolunteer: t('bootstrap.questionnaire.nightVolunteer'),
      nightOnCallOwner: t('bootstrap.questionnaire.nightOnCallOwner'),
      nightClosed: t('bootstrap.questionnaire.nightClosed'),
      cleaningOwner: t('bootstrap.questionnaire.cleaningOwner'),
      cleaningDepth: t('bootstrap.questionnaire.cleaningDepth'),
      cleaningStaff: t('bootstrap.questionnaire.cleaningStaff'),
      cleaningVolunteers: t('bootstrap.questionnaire.cleaningVolunteers'),
      cleaningOutsource: t('bootstrap.questionnaire.cleaningOutsource'),
      cleaningMixed: t('bootstrap.questionnaire.cleaningMixed'),
      cleaningDepthOwner: t('bootstrap.questionnaire.cleaningDepthOwner'),
      laundryOps: t('bootstrap.questionnaire.laundryOps'),
      guestPayments: t('bootstrap.questionnaire.guestPayments'),
      paymentsPaidStaff: t('bootstrap.questionnaire.paymentsPaidStaff'),
      paymentsOwner: t('bootstrap.questionnaire.paymentsOwner'),
      paymentsNone: t('bootstrap.questionnaire.paymentsNone'),
      keysAccess: t('bootstrap.questionnaire.keysAccess'),
      keysPaidStaff: t('bootstrap.questionnaire.keysPaidStaff'),
      keysOwner: t('bootstrap.questionnaire.keysOwner'),
      keysVolunteer: t('bootstrap.questionnaire.keysVolunteer'),
      keysSelfService: t('bootstrap.questionnaire.keysSelfService'),
      peakDays: t('bootstrap.questionnaire.peakDays'),
      peakDaysPlaceholder: t('bootstrap.questionnaire.peakDaysPlaceholder'),
      specialConstraints: t('bootstrap.questionnaire.specialConstraints'),
      specialConstraintsPlaceholder: t(
        'bootstrap.questionnaire.specialConstraintsPlaceholder'
      ),
      yes: t('bootstrap.questionnaire.yes'),
      no: t('bootstrap.questionnaire.no'),
      other: t('bootstrap.questionnaire.other'),
      otherNotePlaceholder: t('bootstrap.questionnaire.otherNotePlaceholder'),
      otherNoteRequired: t('bootstrap.questionnaire.otherNoteRequired'),
      timePlaceholder: t('bootstrap.questionnaire.timePlaceholder'),
      criticalPrefillHint: t('bootstrap.questionnaire.criticalPrefillHint'),
    },
  };

  const frame = getOwnerDashboardFrameClasses();

  return (
    <div className={frame.content}>
      <StaffKnowledgePanel
        locale={locale}
        hostelName={context.name}
        labels={labels}
        aiConfigured={aiConfigured}
        initialQuestionnaire={questionnaire}
        initialPrefillFlags={fromSettings}
        data={{
          roles: snapshot.roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            headcount: role.headcount,
            laborType: role.labor_type,
            checklist: role.checklist.map((item) => ({
              id: item.id,
              body: item.body,
            })),
          })),
          articles: snapshot.articles.map((article) => ({
            id: article.id,
            roleId: article.role_id,
            title: article.title,
            body: article.body,
            videoUrl: article.video_url,
          })),
        }}
      />
    </div>
  );
}
