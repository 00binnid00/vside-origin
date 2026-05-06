"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiHtml5, DiReact } from "react-icons/di";
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
    icon: <DiJava size={44} className="text-green-600" />,
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
    name: "React / Next.js",
    desc: "컴포넌트 기반 모던 웹 프론트엔드",
    icon: <DiReact size={44} className="text-blue-400" />,
    stack: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
    commands: ["npm install", "npm run dev"],
    structure: [
      "app/page.tsx",
      "app/layout.tsx",
      "components/ui",
      "public",
      "package.json",
      "tsconfig.json",
      "README.md",
    ],
    detail:
    "React와 Next.js 기반의 최신 프론트엔드 개발 템플릿입니다. 컴포넌트 중심 UI 개발과 빠른 웹 서비스 구축에 적합합니다.",
  },
  {
    id: "vanilla",
    type: "VANILLA",
    lang: "HTML",
    category: "frontend",
    name: "Vanilla Web",
    desc: "HTML / CSS / JS 빌드 없는 기본 웹",
    icon: <DiHtml5 size={44} className="text-orange-500" />,
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
    icon: <DiJava size={44} className="text-orange-400" />,
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
    icon: <DiPython size={44} className="text-blue-500" />,
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
    icon: <div className="text-2xl font-black text-blue-600">C++</div>,
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

  useEffect(() => {
    if (language && !selectedTemplate) {
      const found = TEMPLATES.find((t) => t.lang === language);

      if (found) {
        setSelectedTemplate(found);
      }
    }
  }, [language, selectedTemplate]);

  const goNext = () => {
    if (!selectedTemplate) return;

    setLanguage(selectedTemplate.lang);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "wizard_template_type",
        selectedTemplate.type
      );
    }

    router.push("/new/config");
  };

  const goBack = () => {
    router.push("/new/workspace");
  };

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
    }
  }, [mode, router]);

  if (!mode) return null;

  const filteredTemplates = TEMPLATES.filter(
    (t) => filter === "all" || t.category === filter
  );

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
              className="flex items-center leading-6"
              style={{ paddingLeft: `${depth * 18}px` }}
            >
              <span className="text-gray-500 mr-1">
                {isLast ? "└─" : "├─"}
              </span>

              <span
                className={
                  hasChildren
                    ? "text-blue-300 font-medium"
                    : "text-gray-100"
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

  return (
    <WizardShell>
      <div className="max-w-5xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              템플릿 선택
            </h2>

            <p className="text-sm font-semibold text-gray-500 mt-1.5">
              원하시는 개발 환경의 템플릿을 선택해주세요.
            </p>
          </div>

          <div className="flex gap-2 mb-6 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-fit">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setSelectedTemplate(null);
                }}
                className={`px-5 py-2 text-[13px] font-bold rounded-lg transition-all ${
                  filter === f.id
                    ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="min-h-[360px]">
            {!selectedTemplate ? (
              <div className="grid grid-cols-2 gap-4 content-start">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="relative flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 border-gray-100 hover:border-blue-300 hover:shadow-sm bg-white"
                  >
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-50 rounded-xl mr-5 shrink-0 shadow-inner border border-gray-100">
                      {template.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-gray-800 text-[15px] truncate">
                        {template.name}
                      </div>

                      <div className="text-[12px] font-medium text-gray-500 mt-1.5 leading-snug break-keep">
                        {template.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-[280px_1fr] gap-5">
                <div className="space-y-3">
                  {filteredTemplates.map((template) => {
                    const isSelected =
                      selectedTemplate.id === template.id;

                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`relative flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/40 shadow-sm"
                            : "border-gray-100 bg-white hover:border-blue-300 hover:shadow-sm"
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl shrink-0 border border-gray-100">
                          {template.icon}
                        </div>

                        <div className="min-w-0 pr-5">
                          <div className="font-extrabold text-gray-800 text-[13px] truncate">
                            {template.name}
                          </div>

                          <div className="text-[11px] font-medium text-gray-500 mt-1 truncate">
                            {template.desc}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3 bg-blue-500 rounded-full p-0.5">
                            <VscCheck
                              size={12}
                              className="text-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-inner">
                      {selectedTemplate.icon}
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-gray-900">
                        {selectedTemplate.name}
                      </h3>

                      <p className="text-[13px] font-semibold text-gray-500 mt-1">
                        {selectedTemplate.desc}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <section>
                      <h4 className="text-[12px] font-black text-gray-400 mb-2">
                        템플릿 설명
                      </h4>

                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-[13px] leading-6 text-gray-600 font-medium break-keep">
                          {selectedTemplate.detail}
                        </p>
                      </div>
                    </section>
                    <section>
                      <h4 className="text-[12px] font-black text-gray-400 mb-2">
                        기술 스택
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.stack.map((item) => (
                          <span
                            key={item}
                            className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[12px] font-bold text-gray-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[12px] font-black text-gray-400 mb-2">
                        생성 파일 구조
                      </h4>

                      <div className="bg-[#1e1e1e] text-gray-200 rounded-xl p-4 font-mono text-[12px] leading-6 overflow-x-auto">
                        <div className="text-blue-300 mb-1 font-semibold">
                          ▾ my-project
                        </div>

                        {renderFileTree(
                          selectedTemplate.structure
                        )}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[12px] font-black text-gray-400 mb-2">
                        실행 방법
                      </h4>

                      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                        {selectedTemplate.commands.map((command) => (
                          <div
                            key={command}
                            className="font-mono text-[12px] text-gray-700"
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
          </div>

          <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
            <button
              onClick={goBack}
              className="px-6 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              뒤로(B)
            </button>

            <button
              onClick={goNext}
              disabled={!selectedTemplate}
              className={`px-8 py-3 rounded-xl font-extrabold transition-all active:scale-95 ${
                !selectedTemplate
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              }`}
            >
              다음 단계로(N)
            </button>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}