import { useState } from "react";

type ReportModalProps = {
  open: boolean;
  postId: number;
  onClose: () => void;
};

type ReportReason =
  | "ABUSE"
  | "SPAM"
  | "OBSCENE"
  | "PERSONAL_INFO"
  | "ETC";

export default function ReportModal({
  open,
  postId,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [content, setContent] = useState("");

  if (!open) {
    return null;
  }

  const handleSubmit = async () => {
    if (!reason) {
      alert("신고 사유를 선택해주세요.");
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        `/api/community/posts/${postId}/reports`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && {
              Authorization: `Bearer ${token}`,
            }),
          },
          body: JSON.stringify({
            reason,
            content,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("신고 접수에 실패했습니다.");
      }

      alert("신고가 접수되었습니다.");

      setReason("");
      setContent("");
      onClose();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "신고 처리 중 오류가 발생했습니다."
      );
    }
  };

  return (
    <div className="report-overlay" onClick={onClose}>
      <div
        className="report-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="report-header">
          <h2>게시글 신고</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="report-reasons">
          <label>
            <input
              type="radio"
              name="reportReason"
              value="ABUSE"
              checked={reason === "ABUSE"}
              onChange={() => setReason("ABUSE")}
            />
            욕설 및 비방
          </label>

          <label>
            <input
              type="radio"
              name="reportReason"
              value="SPAM"
              checked={reason === "SPAM"}
              onChange={() => setReason("SPAM")}
            />
            광고 및 도배
          </label>

          <label>
            <input
              type="radio"
              name="reportReason"
              value="OBSCENE"
              checked={reason === "OBSCENE"}
              onChange={() => setReason("OBSCENE")}
            />
            음란하거나 부적절한 내용
          </label>

          <label>
            <input
              type="radio"
              name="reportReason"
              value="PERSONAL_INFO"
              checked={reason === "PERSONAL_INFO"}
              onChange={() => setReason("PERSONAL_INFO")}
            />
            개인정보 노출
          </label>

          <label>
            <input
              type="radio"
              name="reportReason"
              value="ETC"
              checked={reason === "ETC"}
              onChange={() => setReason("ETC")}
            />
            기타
          </label>
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="상세 사유를 입력해주세요. (선택)"
          maxLength={500}
        />

        <div className="report-buttons">
          <button type="button" onClick={onClose}>
            취소
          </button>

          <button type="button" onClick={handleSubmit}>
            신고하기
          </button>
        </div>
      </div>
    </div>
  );
}