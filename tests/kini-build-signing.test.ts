import { describe, expect, it } from "vitest";

import { assertTrustedGithubBuild } from "../server/github-build-signing";

describe("KINI GitHub build signing", () => {
  it("chỉ tin cậy workflow build chạy thủ công từ nhánh main", () => {
    expect(() => assertTrustedGithubBuild({
      repository: "haitruongproqt1-a11y/KINI",
      workflow_ref: "haitruongproqt1-a11y/KINI/.github/workflows/build-release.yml@refs/heads/main",
      ref: "refs/heads/main",
      event_name: "workflow_dispatch",
    })).not.toThrow();
  });

  it("từ chối workflow hoặc repository không đúng", () => {
    expect(() => assertTrustedGithubBuild({
      repository: "other/KINI",
      workflow_ref: "other/KINI/.github/workflows/build-release.yml@refs/heads/main",
      ref: "refs/heads/main",
      event_name: "workflow_dispatch",
    })).toThrow("không thuộc workflow build KINI");
  });
});
