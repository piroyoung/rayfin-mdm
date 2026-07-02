/** MDMとは？: Japanese onboarding guide for first-time MDM users. */
import { Link } from 'react-router-dom';

import { Badge, Card, PageHeader } from '@/components/shared';

/** Short walkthrough of every menu item, for newcomers. */
const MENU_GUIDE: Array<{
  to: string;
  name: string;
  en: string;
  description: string;
}> = [
  {
    to: '/',
    name: 'ダッシュボード',
    en: 'Dashboard',
    description:
      '全ドメインの主要指標（マスター件数・ゴールデンレコード・データ品質・承認待ち）と最近の活動をひと目で確認できます。まずはここで全体像をつかみましょう。',
  },
  {
    to: '/accounts',
    name: 'アカウント',
    en: 'Accounts',
    description:
      'アカウント（顧客企業）マスターの作成・編集・検索ができます。重複の検出と統合（名寄せ）、承認申請、アーカイブなどのライフサイクル操作もここから行います。テリトリーや担当者は持たせず、Assignment で年度別に紐づけます。',
  },
  {
    to: '/stewardship',
    name: 'スチュワードシップ',
    en: 'Stewardship',
    description:
      '提出された変更申請を確認し、「承認（Approve）」または「却下（Reject）」する承認キューです。承認された内容だけがゴールデンレコードに反映されます。',
  },
  {
    to: '/reference',
    name: '参照データ',
    en: 'Reference Data',
    description:
      '国コードや区分など、各ドメインで共通利用するコードリスト（参照データ）を管理します。表記の統一に役立ちます。',
  },
  {
    to: '/audit',
    name: '監査ログ',
    en: 'Audit Log',
    description:
      'すべての作成・更新・承認・統合の履歴を記録した、改ざんできない証跡です。いつ・誰が・何を変更したかを後から追跡できます。',
  },
];

const WORKFLOW: Array<{ badge: string; title: string; body: string }> = [
  {
    badge: '1',
    title: 'レコードを作成する（ドラフト）',
    body: '「顧客」や「製品」画面の「＋ 新規」ボタンから情報を登録します。保存した直後は未提出の「ドラフト（下書き）」状態です。',
  },
  {
    badge: '2',
    title: '承認に提出する（Submit）',
    body: '内容が整ったら「Submit」ボタンで承認キューに送ります。ステータスは「承認待ち」に変わります。',
  },
  {
    badge: '3',
    title: 'スチュワードが審査する',
    body: 'スチュワードシップ画面で担当者が内容を確認し、「承認（Approve）」または「却下（Reject）」します。却下された場合は修正して再提出します。',
  },
  {
    badge: '4',
    title: 'ゴールデンレコードになる',
    body: '承認されると、そのレコードは「単一の信頼できる情報源」＝ゴールデンレコード（★）になります。組織全体で安心して参照できます。',
  },
];

const GLOSSARY: Array<{ term: string; meaning: string }> = [
  {
    term: 'マスターデータ',
    meaning:
      '顧客・製品など、組織のさまざまな業務で共通して使われる中核的なデータのことです。',
  },
  {
    term: 'ゴールデンレコード',
    meaning:
      '承認済みで最も信頼できる「正」のレコード。このアプリでは ★ マークで表示されます。',
  },
  {
    term: 'データ品質スコア',
    meaning:
      '必須項目が埋まっているか、形式が正しいかなどを 0〜100% で評価した指標です。高いほど良質なデータです。',
  },
  {
    term: '名寄せ / 統合（マージ）',
    meaning:
      '同じ対象を指す重複レコードを 1 件にまとめる操作です。正として残す 1 件を選んで統合します。',
  },
  {
    term: 'スチュワードシップ',
    meaning:
      '変更を承認・却下し、データの品質と正しさを守る管理プロセス（データの番人）です。',
  },
  {
    term: '参照データ',
    meaning:
      '国コードや区分など、各所で共有する定義済みのコードリストです。表記ゆれを防ぎます。',
  },
  {
    term: '監査ログ',
    meaning:
      'いつ・誰が・何を変更したかを記録した、改ざんできない変更履歴です。',
  },
  {
    term: 'ステータス',
    meaning:
      'レコードの状態。ドラフト / 承認待ち / 承認済み / アーカイブ / 却下 / 統合済み などがあります。',
  },
];

export function GuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="MDMとは？"
        subtitle="MDM をはじめて使う方のための、やさしい日本語ガイドです。"
      />

      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-7 text-white">
          <h2 className="text-lg font-semibold">
            MDM（マスターデータ管理）とは
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-50">
            MDM は <strong>Master Data Management（マスターデータ管理）</strong>{' '}
            の略です。顧客や製品といった、社内のいろいろな部署・システムで共通して使う
            「もっとも大切なデータ」を、<strong>正確で・重複がなく・最新の状態</strong>{' '}
            に保つための仕組みです。バラバラに管理されがちな情報を一元化し、
            組織全体で「信頼できる唯一の情報源」を作ることを目的としています。
          </p>
        </div>
      </Card>

      {/* What is master data */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">
          そもそも「マスターデータ」とは？
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          マスターデータとは、業務の土台になる
          <strong>中核的なデータ</strong>のことです。たとえば次のようなものがあります。
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-medium text-gray-900">顧客マスター</span>
            <br />
            会社名・住所・連絡先・取引区分など、顧客に関する基本情報。
          </li>
          <li className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-medium text-gray-900">製品マスター</span>
            <br />
            SKU・商品名・カテゴリ・価格など、製品に関する基本情報。
          </li>
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          こうしたデータが部署ごとにバラバラだと、
          <span className="text-gray-900">「同じ顧客なのに情報が食い違う」</span>
          といった問題が起きます。MDM はそれを防ぎます。
        </p>
      </Card>

      {/* Why MDM */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          MDM が解決する 3 つの課題
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <Badge tone="amber">重複</Badge>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              データの重複
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              同じ顧客や製品が二重・三重に登録されてしまう問題。MDM
              は重複を検出し、1 件に統合（名寄せ）できます。
            </p>
          </Card>
          <Card className="p-5">
            <Badge tone="red">不整合</Badge>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              表記ゆれ・不整合
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              システムごとに書き方や区分が異なる問題。参照データで用語を統一し、
              承認フローで正しい値だけを残します。
            </p>
          </Card>
          <Card className="p-5">
            <Badge tone="green">品質</Badge>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              品質のばらつき
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
              必須項目の抜けや形式ミス。データ品質スコアで状態を可視化し、
              改善すべき箇所がすぐ分かります。
            </p>
          </Card>
        </div>
      </div>

      {/* Menu walkthrough */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">
          このアプリの各メニュー
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          左側のメニューから各画面に移動できます。それぞれの役割は次のとおりです。
        </p>
        <ul className="mt-4 space-y-3">
          {MENU_GUIDE.map((item) => (
            <li
              key={item.to}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 p-4 sm:flex-row sm:items-start sm:gap-4"
            >
              <Link
                to={item.to}
                className="shrink-0 font-medium text-indigo-600 hover:text-indigo-500"
              >
                {item.name}
                <span className="ml-1 text-xs text-gray-400">（{item.en}）</span>
              </Link>
              <p className="text-sm leading-relaxed text-gray-600">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Workflow */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">
          基本的な使い方（4 ステップ）
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          レコードはこの流れを通って「ゴールデンレコード」になります。
        </p>
        <ol className="mt-4 space-y-4">
          {WORKFLOW.map((step) => (
            <li key={step.badge} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {step.badge}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <span className="font-medium text-gray-700">ステータスの流れ：</span>
          <Badge tone="gray">ドラフト</Badge>
          <span aria-hidden>→</span>
          <Badge tone="amber">承認待ち</Badge>
          <span aria-hidden>→</span>
          <Badge tone="green">承認済み（★ ゴールデン）</Badge>
        </div>
      </Card>

      {/* Glossary */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900">
          覚えておきたい用語
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="text-sm font-semibold text-gray-900">{g.term}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-gray-600">
                {g.meaning}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* CTA */}
      <Card className="flex flex-col items-start justify-between gap-3 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            さっそく始めてみましょう
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            まずはダッシュボードで全体像を確認するのがおすすめです。各ボタンには
            日本語の操作ヒントが表示されるので、マウスを重ねて確認できます。
          </p>
        </div>
        <Link
          to="/"
          className="shrink-0 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110"
        >
          ダッシュボードへ →
        </Link>
      </Card>
    </div>
  );
}
