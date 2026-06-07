"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiHtml5, DiReact } from "react-icons/di";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  PlayCircle,
  Search,
} from "lucide-react";
import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

const TEMPLATES = [
  {
    id: "spring",
    type: "SPRING_BOOT",
    lang: "JAVA",
    category: "server",
    name: "Spring Boot",
    desc: "엔터프라이즈급 REST API 및 JPA 활용",
    icon: <DiJava size={38} className="text-green-600" />,
    stack: ["Java", "Spring Boot", "JPA", "Gradle"],
    commands: ["./gradlew bootRun"],
    structure: [
      "src/main/java",
      "src/main/resources",
      "build.gradle",
      "application.yml",
      "README.md",
    ],
    detail:
      "Spring Boot 기반의 백엔드 서버 프로젝트 템플릿입니다. REST API 개발, 데이터베이스 연동, JPA 기반 서버 구축에 적합합니다.",
  },
  {
    id: "react",
    type: "REACT",
    lang: "JAVASCRIPT",
    category: "frontend",
    name: "React",
    desc: "Vite 기반 컴포넌트형 프론트엔드",
    icon: <DiReact size={38} className="text-blue-400" />,
    stack: ["React", "Vite", "JavaScript", "CSS"],
    commands: ["npm install", "npm run dev"],
    structure: [
      "index.html",
      "src/main.jsx",
      "src/App.jsx",
      "src/style.css",
      "public",
      "package.json",
      "README.md",
    ],
    detail:
      "Vite 기반의 React 프론트엔드 템플릿입니다. 컴포넌트 중심 UI 개발과 빠른 화면 개발에 적합합니다.",
  },
  {
    id: "next",
    type: "NEXT",
    lang: "JAVASCRIPT",
    category: "frontend",
    name: "Next.js",
    desc: "React 기반 풀스택 웹 프레임워크",
    icon: (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
        N
      </div>
    ),
    stack: ["Next.js", "React", "App Router", "CSS"],
    commands: ["npm install", "npm run dev"],
    structure: [
      "app/layout.js",
      "app/page.js",
      "app/globals.css",
      "public",
      "next.config.mjs",
      "package.json",
      "README.md",
    ],
    detail:
      "React 기반 Next.js 템플릿입니다. App Router 구조를 사용하며 페이지 라우팅, 서버 렌더링, 웹 서비스 개발에 적합합니다.",
  },
  {
    id: "vanilla",
    type: "VANILLA",
    lang: "HTML",
    category: "frontend",
    name: "Vanilla Web",
    desc: "HTML / CSS / JS 빌드 없는 기본 웹",
    icon: <DiHtml5 size={38} className="text-orange-500" />,
    stack: ["HTML", "CSS", "JavaScript"],
    commands: ["Open with Live Server"],
    structure: ["index.html", "style.css", "script.js", "assets/images"],
    detail:
      "HTML, CSS, JavaScript만으로 구성된 기본 웹 프로젝트 템플릿입니다. 별도의 빌드 과정 없이 빠르게 웹 페이지를 제작할 수 있습니다.",
  },
  {
    id: "console_java",
    type: "CONSOLE",
    lang: "JAVA",
    category: "console",
    name: "Java Console",
    desc: "객체지향 기본 학습 및 알고리즘",
    icon: <DiJava size={38} className="text-orange-400" />,
    stack: ["Java"],
    commands: ["javac Main.java", "java Main"],
    structure: ["src/Main.java", "README.md"],
    detail:
      "Java 기반의 콘솔 프로그램 템플릿입니다. 객체지향 프로그래밍 학습과 알고리즘 및 자료구조 문제 풀이에 적합합니다.",
  },
  {
    id: "console_py",
    type: "CONSOLE",
    lang: "PYTHON",
    category: "console",
    name: "Python Console",
    desc: "가벼운 스크립트, 코딩 테스트",
    icon: <DiPython size={38} className="text-blue-500" />,
    stack: ["Python"],
    commands: ["python main.py"],
    structure: ["main.py", "requirements.txt", "README.md"],
    detail:
      "Python 기반의 콘솔 프로젝트 템플릿입니다. 간단한 스크립트 작성, 자동화 작업, 코딩 테스트 및 데이터 처리에 적합합니다.",
  },
  {
    id: "console_cpp",
    type: "CONSOLE",
    lang: "CPP",
    category: "console",
    name: "C / C++ Console",
    desc: "알고리즘 및 시스템 프로그래밍",
    icon: <div className="text-xl font-black text-blue-600">C++</div>,
    stack: ["C", "C++"],
    commands: ["g++ main.cpp -o main", "./main"],
    structure: ["main.cpp", "include/vector", "README.md"],
    detail:
      "C/C++ 기반의 콘솔 프로젝트 템플릿입니다. 알고리즘 문제 풀이와 시스템 프로그래밍 및 성능 중심 개발에 적합합니다.",
  },
];

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "frontend", label: "프론트엔드" },
  { id: "server", label: "서버" },
  { id: "console", label: "콘솔" },
];

export default function Page() {
  const router = useRouter();

  const mode = useWorkspaceWizard((s) => s.mode);
  const language = useWorkspaceWizard((s) => s.language);
  const setLanguage = useWorkspaceWizard((s) => s.setLanguage);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (language && !selectedTemplate) {
      const found = TEMPLATES.find((t) => t.lang === language);

      if (found) {
        setSelectedTemplate(found);
      }
    }
  }, [language, selectedTemplate]);

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
    }
  }, [mode, router]);

  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return TEMPLATES.filter((template) => {
      const matchesFilter = filter === "all" || template.category === filter;

      const matchesKeyword =
        !normalizedKeyword ||
        template.name.toLowerCase().includes(normalizedKeyword) ||
        template.desc.toLowerCase().includes(normalizedKeyword) ||
        template.lang.toLowerCase().includes(normalizedKeyword) ||
        template.type.toLowerCase().includes(normalizedKeyword) ||
        template.stack.some((item) =>
          item.toLowerCase().includes(normalizedKeyword),
        );

      return matchesFilter && matchesKeyword;
    });
  }, [filter, keyword]);

  const goNext = () => {
    if (!selectedTemplate) return;

    setLanguage(selectedTemplate.lang);

    if (typeof window !== "undefined") {
      localStorage.setItem("wizard_template_type", selectedTemplate.type);
    }

    router.push("/new/config");
  };

  const goBack = () => {
    router.push("/new/workspace");
  };

  const renderFileTree = (paths) => {
    const tree = {};

    paths.forEach((path) => {
      const parts = path.split("/").filter(Boolean);
      let current = tree;

      parts.forEach((part) => {
        if (!current[part]) {
          current[part] = {};
        }

        current = current[part];
      });
    });

    const renderNode = (node, depth = 0) => {
      const entries = Object.entries(node);

      return entries.map(([name, children], index) => {
        const isLast = index === entries.length - 1;
        const hasChildren = Object.keys(children).length > 0;

        return (
          <div key={`${depth}-${name}-${index}`}>
            <div
              className="flex items-center leading-5"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <span className="mr-1 text-slate-500">
                {isLast ? "└─" : "├─"}
              </span>

              <span
                className={
                  hasChildren
                    ? "font-medium text-blue-300"
                    : "text-slate-200"
                }
              >
                {hasChildren ? "▾ " : ""}
                {name}
              </span>
            </div>

            {hasChildren && renderNode(children, depth + 1)}
          </div>
        );
      });
    };

    return renderNode(tree);
  };

  if (!mode) return null;

  return (
    <WizardShell>
      <div className="mx-auto max-w-6xl px-4">
        <section className="rounded-[26px] border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-50 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Project Create
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  템플릿 선택
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  생성할 프로젝트의 개발 환경과 기본 파일 구조를 선택하세요.
                </p>
              </div>

              <StepIndicator current={2} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[330px_1fr]">
            <aside className="border-b border-blue-50 bg-blue-50/40 p-5 lg:border-b-0 lg:border-r">
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="템플릿 또는 기술 검색"
                  className="h-10 w-full rounded-xl border border-blue-100 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFilter(f.id);
                      setSelectedTemplate(null);
                    }}
                    className={[
                      "h-9 rounded-xl text-xs font-black transition",
                      filter === f.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-blue-100 bg-white text-slate-500 hover:bg-blue-50",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-100 bg-white px-4 py-8 text-center text-sm font-bold text-slate-400">
                    조건에 맞는 템플릿이 없습니다.
                  </div>
                ) : (
                  filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template)}
                        className={[
                          "relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                          isSelected
                            ? "border-blue-500 bg-white shadow-sm ring-4 ring-blue-100"
                            : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
                        ].join(" ")}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-50 bg-blue-50">
                          {template.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-900">
                              {template.name}
                            </p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                              {template.lang}
                            </span>
                          </div>

                          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                            {template.desc}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <VscCheck size={12} />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <main className="p-5">
              {!selectedTemplate ? (
                <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-blue-100 bg-blue-50/40">
                  <div className="max-w-sm text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                      <Code2 size={24} />
                    </div>
                    <h3 className="text-base font-black text-slate-900">
                      템플릿을 선택해주세요
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      왼쪽 목록에서 템플릿을 선택하면 설명, 파일 구조, 실행
                      명령어가 표시됩니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                        {selectedTemplate.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black tracking-tight text-slate-950">
                            {selectedTemplate.name}
                          </h2>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                            {selectedTemplate.lang}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                            {selectedTemplate.type}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          {selectedTemplate.detail}
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.85fr]">
                    <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                      <SectionTitle
                        icon={Code2}
                        title="생성 파일 구조"
                        description="템플릿 적용 시 생성되는 기본 디렉터리입니다."
                      />

                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-200">
                        <div className="mb-1 font-semibold text-blue-300">
                          ▾ my-project
                        </div>
                        {renderFileTree(selectedTemplate.structure)}
                      </div>
                    </section>

                    <div className="space-y-4">
                      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                        <SectionTitle
                          icon={Cpu}
                          title="기술 스택"
                          description="초기 프로젝트에 포함되는 주요 기술입니다."
                        />

                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedTemplate.stack.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                        <SectionTitle
                          icon={PlayCircle}
                          title="실행 방법"
                          description="생성 후 터미널에서 사용할 명령어입니다."
                        />

                        <div className="mt-3 space-y-2">
                          {selectedTemplate.commands.map((command) => (
                            <div
                              key={command}
                              className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5 font-mono text-xs font-bold text-slate-700"
                            >
                              $ {command}
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-blue-50 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              뒤로
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={!selectedTemplate}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              다음 단계
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </WizardShell>
  );
}

function StepIndicator({ current }) {
  const steps = ["기본 정보", "템플릿 선택", "작업 공간 구성"];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === current;
        const isDone = stepNumber < current;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-black",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDone
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span>{stepNumber}</span>}
              <span>{step}</span>
            </div>

            {index < steps.length - 1 && (
              <div className="hidden h-px w-5 bg-slate-200 sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <Icon size={17} />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}