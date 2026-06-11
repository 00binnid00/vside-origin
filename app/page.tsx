
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FolderPlus,
  LayoutDashboard,
  FileText,
  CalendarDays,
  Code2,
  GitBranch,
  Network,
  FlaskConical,
  Archive,
  Users,
  CheckCircle2,
  Plus,
} from "lucide-react";

type FlowItem = {
  step: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type PreviewItem = {
  title: string;
  description: string;
  imgSrc: string;
};

type WorkspaceItem = {
  title: string;
  badge: string;
  description: string;
  points: string[];
  imgSrc: string;
};

function Reveal({
  children,
  delay = 0,
  y = 18,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(2px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.7,
        ease: [0.2, 0.8, 0.2, 1],
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}

export default function WevaisLandingPage() {
  const flowItems: FlowItem[] = [
    {
      step: "01",
      title: "프로젝트 생성",
      description:
        "개인 또는 팀 프로젝트를 생성하고, 사용할 개발 언어와 작업 공간을 선택합니다.",
      icon: FolderPlus,
    },
    {
      step: "02",
      title: "설계 관리",
      description:
        "요구사항, ERD, API 명세, 데이터 흐름을 정리해 개발 전에 필요한 구조를 잡습니다.",
      icon: FileText,
    },
    {
      step: "03",
      title: "일정 관리",
      description:
        "프로젝트 일정과 진행 상태를 관리하고, 개발일지와 연결해 작업 흐름을 이어갑니다.",
      icon: CalendarDays,
    },
    {
      step: "04",
      title: "AIVS ",
      description:
        "웹 기반 AIVS에서 코드를 작성하고, AI 코드 어시스트를 활용해 개발을 진행합니다.",
      icon: Code2,
    },
    {
      step: "05",
      title: "API 테스트",
      description:
        "작성한 API를 바로 요청하고 응답 결과를 확인해 개발 흐름을 끊지 않고 테스트합니다.",
      icon: FlaskConical,
    },
    {
      step: "06",
      title: "기록 및 문서화",
      description:
        "개발일지, 설계문서, API 명세, 최종보고서를 자료실에서 관리하고 출력합니다.",
      icon: Archive,
    },
  ];

  const previewItems: PreviewItem[] = [
    {
      title: "AIVS",
      description:
        "코드 작성, AI 코드 어시스트, 코드맵, API 테스트를 하나의 개발 화면 안에서 사용할 수 있습니다.",
      imgSrc: "/aivs.png",
    },
    {
      title: "팀 협업 화면",
      description:
        "팀 프로젝트에서는 팀원과 같은 작업 공간에서 코드를 작성하고 프로젝트 흐름을 공유합니다.",
      imgSrc: "/team.png",
    },
    {
      title: "코드맵",
      description:
        "파일, 클래스, 메서드 관계를 시각적으로 확인해 프로젝트 구조를 빠르게 파악합니다.",
      imgSrc: "/codemap.png",
    },
  ];

  const workspaceItems: WorkspaceItem[] = [
    {
      title: "개인 프로젝트",
      badge: "Personal",
      description:
        "혼자 진행하는 프로젝트의 설계, 일정, 코드 작성, 개발일지를 하나의 흐름으로 관리합니다.",
      points: [
        "개인 작업 공간에서 프로젝트 생성",
        "설계 관리와 일정 관리 연결",
        "개발일지와 자료실을 통한 작업 기록",
      ],
      imgSrc: "/personal.png",
    },
    {
      title: "팀 프로젝트",
      badge: "Team",
      description:
        "팀원이 함께 개발하는 프로젝트에서 코드 작업, 일정 공유, 문서화를 함께 진행합니다.",
      points: [
        "팀 프로젝트 참여 및 초대",
        "팀원과 작업 흐름 공유",
        "공통 설계문서와 개발 기록 관리",
      ],
      imgSrc: "/team.png",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-blue-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute right-[-120px] top-32 h-72 w-72 rounded-full bg-indigo-200/35 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                웹 기반 통합 개발 환경
              </div>

              <h1 className="text-4xl font-black tracking-tight text-gray-950 md:text-6xl">
                WAIVS
              </h1>

              <p className="mt-5 text-2xl font-extrabold leading-tight text-gray-900 md:text-4xl">
                설계부터 코드 작성, 테스트, 기록까지
                <br className="hidden md:block" />
                하나의 워크스페이스에서 이어지는 개발 흐름
              </p>

              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 md:text-lg">
                WAIVS는 개인 프로젝트와 팀 프로젝트를 구분해 관리하고,
                설계 관리, 일정 관리, AIVS, API 테스트, 개발일지,
                자료실을 연결해 개발 과정을 한 화면 흐름으로 관리하는
                시스템입니다.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/main"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-gray-300 bg-white px-6 py-4 text-sm font-bold text-gray-900 transition hover:bg-gray-50"
                >
                  대시보드로 이동
                  <ArrowRight className="h-4 w-4" />
                </Link>

                      <Link
                  href="/new/workspace"
                   onClick={() => {
    sessionStorage.setItem("workspace_create_entry", "dashboard");
  }}
                  className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  새 프로젝트 생성
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="mx-auto mt-14 max-w-5xl rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-5">
                  <LayoutDashboard className="h-6 w-6 text-blue-600" />
                  <p className="mt-4 text-sm font-bold text-gray-950">
                    프로젝트 중심 관리
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    로그인 후 대시보드에서 개인/팀 프로젝트를 선택해 작업을
                    시작합니다.
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <GitBranch className="h-6 w-6 text-blue-600" />
                  <p className="mt-4 text-sm font-bold text-gray-950">
                    개발 과정 연결
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    설계, 일정, 코드 작성, 테스트, 기록을 분리하지 않고 하나의
                    흐름으로 이어갑니다.
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-5">
                  <Users className="h-6 w-6 text-blue-600" />
                  <p className="mt-4 text-sm font-bold text-gray-950">
                    개인/팀 작업 지원
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    혼자 진행하는 프로젝트와 팀으로 진행하는 프로젝트를 각각의
                    방식에 맞게 관리합니다.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* System Overview */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-bold text-blue-600">SYSTEM OVERVIEW</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
                  기능을 따로 사용하는 것이 아니라,
                  <br />
                  프로젝트 흐름 안에서 연결합니다.
                </h2>
                <p className="mt-5 text-base leading-8 text-gray-600">
                  일반적인 개발 도구는 코드 작성, 일정 관리, API 테스트,
                  문서화가 각각 다른 환경에 흩어져 있습니다. WAIVS는 이러한
                  작업을 하나의 프로젝트 공간 안에 배치해 사용자가 개발 과정을
                  순서대로 이어갈 수 있도록 구성합니다.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "프로젝트 선택",
                    "설계 관리",
                    "일정 관리",
                    "AIVS 작업",
                    "API 테스트",
                    "개발일지 작성",
                    "자료실 관리",
                    "최종보고서 정리",
                  ].map((text) => (
                    <div
                      key={text}
                      className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                      <span className="text-sm font-bold text-gray-800">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-blue-600">WORKFLOW</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
                WAIVS의 개발 작업 흐름
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                로고 홈 화면에서는 기능을 단순히 홍보하지 않고, 사용자가
                프로젝트를 생성한 뒤 어떤 순서로 개발을 진행하는지 보여줍니다.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {flowItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal key={item.step} delay={index * 70}>
                  <div className="h-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-500">
                        {item.step}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-black text-gray-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workspace Types */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-sm font-bold text-blue-600">WORKSPACE</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
                개인 프로젝트와 팀 프로젝트를 분리해 관리합니다.
              </h2>
              <p className="mt-4 text-base leading-8 text-gray-600">
                같은 개발 도구를 사용하더라도 개인 작업과 팀 협업은 필요한
                관리 방식이 다릅니다. WAIVS는 프로젝트 유형에 따라 작업 공간을
                구분합니다.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {workspaceItems.map((item, index) => (
              <Reveal key={item.title} delay={index * 100}>
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative h-[260px] bg-gray-100">
                    <Image
                      src={item.imgSrc}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute left-5 top-5 rounded-full border border-white/60 bg-white/85 px-4 py-2 text-xs font-black text-gray-800 backdrop-blur">
                      {item.badge}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-2xl font-black text-gray-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      {item.description}
                    </p>

                    <ul className="mt-5 space-y-3">
                      {item.points.map((point) => (
                        <li
                          key={point}
                          className="flex gap-3 text-sm leading-6 text-gray-700"
                        >
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Preview */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-bold text-blue-600">MAIN SCREENS</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
                  주요 화면 미리보기
                </h2>
                <p className="mt-4 text-base leading-8 text-gray-600">
                  사용자는 로그인 후 대시보드에서 프로젝트를 선택하고, 선택한
                  프로젝트 안에서 AIVS, 설계 관리, 일정 관리, 개발일지, 자료실로
                  이동할 수 있습니다.
                </p>
              </div>

              <Link
                href="/main"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-100"
              >
                프로젝트 선택 화면으로 이동
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {previewItems.map((item, index) => (
              <Reveal key={item.title} delay={index * 90}>
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                  <div className="relative h-[220px] bg-gray-100">
                    <Image
                      src={item.imgSrc}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-black text-gray-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Code Map / API / Document */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <Reveal>
            <div className="rounded-[2rem] border border-gray-200 bg-gradient-to-br from-gray-950 to-gray-800 p-8 text-white md:p-10">
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <p className="text-sm font-bold text-blue-300">
                    DEVELOPMENT SUPPORT
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                    코드 이해, 테스트, 문서화를 개발 과정에 포함합니다.
                  </h2>
                  <p className="mt-5 text-base leading-8 text-gray-300">
                    WEVAIS는 코드를 작성하는 화면에만 머무르지 않고, 프로젝트
                    구조 파악, API 테스트, 개발 기록, 문서 출력을 함께 제공합니다.
                    이를 통해 개발 결과뿐 아니라 개발 과정 자체를 관리할 수
                    있습니다.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <Network className="h-6 w-6 text-blue-300" />
                    <h3 className="mt-4 font-black">코드맵</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      파일과 메서드 관계를 시각화해 코드 구조를 확인합니다.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <FlaskConical className="h-6 w-6 text-blue-300" />
                    <h3 className="mt-4 font-black">API 테스트</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      작성한 API를 바로 요청하고 응답 결과를 확인합니다.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <FileText className="h-6 w-6 text-blue-300" />
                    <h3 className="mt-4 font-black">개발일지</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      일정과 연결해 작업 내용을 기록하고 관리합니다.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <Archive className="h-6 w-6 text-blue-300" />
                    <h3 className="mt-4 font-black">자료실</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      개발일지, 설계문서, 최종보고서를 문서로 정리합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-blue-50 p-8 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-950">
                  프로젝트는 대시보드에서 선택하고, 작업은 프로젝트에서 이어갑니다.
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  로고 홈 화면은 WEVAIS의 전체 개발 흐름을 안내하고, 실제 작업은
                  로그인 후 프로젝트 대시보드에서 시작합니다.
                </p>
              </div>

              <Link
                href="/main"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                대시보드로 이동
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
