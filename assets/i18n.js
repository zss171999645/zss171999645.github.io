(function () {
  const STORAGE_KEY = "zhoufeng-homepage-language-v2";
  const DEFAULT_LANG = "zh";

  const pageMeta = {
    about: {
      en: {
        title: "Feng Zhou - About",
        description:
          "Feng Zhou is a Ph.D. student at Beijing University of Posts and Telecommunications working on 3D reconstruction foundation models, 3D world models, and controllable visual generation.",
      },
      zh: {
        title: "周峰 - 个人简介",
        description:
          "周峰，北京邮电大学博士研究生，研究方向包括三维重建基础模型、三维世界模型与可控视觉生成。",
      },
    },
    publications: {
      en: {
        title: "Feng Zhou - Publications",
        description:
          "Selected publications by Feng Zhou on 3D reconstruction, controllable generation, and diffusion models.",
      },
      zh: {
        title: "周峰 - 主要论文",
        description: "周峰在三维重建、可控生成与扩散模型方向的主要论文。",
      },
    },
    cv: {
      en: {
        title: "Feng Zhou - CV",
        description:
          "Curriculum Vitae of Feng Zhou, Ph.D. student at Beijing University of Posts and Telecommunications.",
      },
      zh: {
        title: "周峰 - 简历",
        description: "周峰，北京邮电大学博士研究生，个人简历与研究经历。",
      },
    },
  };

  const translations = {
    "nav.about": { en: "About", zh: "个人简介" },
    "nav.publications": { en: "Publications", zh: "主要论文" },
    "nav.cv": { en: "CV", zh: "简历" },
    "toggle.toChinese": { en: "中文", zh: "中文" },
    "toggle.toEnglish": { en: "EN", zh: "EN" },

    "profile.name": { en: "Feng Zhou", zh: "周峰" },
    "profile.bio": {
      en: "Ph.D. student at Beijing University of Posts and Telecommunications. My work focuses on 3D reconstruction foundation models, 3D world models, and controllable visual generation.",
      zh: "北京邮电大学控制科学与工程博士研究生，研究方向聚焦三维重建基础模型、三维世界模型与可控视觉生成。",
    },
    "profile.location": { en: "Beijing, China", zh: "中国北京" },
    "profile.institution": {
      en: "Beijing University of Posts and Telecommunications",
      zh: "北京邮电大学",
    },
    "profile.email": { en: "Email", zh: "邮箱" },
    "profile.cv": { en: "CV", zh: "简历" },
    "profile.pdfCv": { en: "PDF CV", zh: "PDF 简历" },

    "home.eyebrow": { en: "About Me", zh: "个人简介" },
    "home.title": { en: "About Me", zh: "个人简介" },
    "home.intro.education": {
      en: "I am a Ph.D. student in Control Science and Engineering at Beijing University of Posts and Telecommunications, advised by Prof. Jianqin Yin at the BUPT-COST Lab. I received my B.Eng. degree in Internet of Things Engineering from BUPT in 2022.",
      zh: "我目前是北京邮电大学控制科学与工程专业博士研究生，师从尹建芹教授，在 BUPT-COST Lab 开展研究；本科毕业于北京邮电大学物联网工程专业，获工学学士学位。",
    },
    "home.intro.research": {
      en: "My research interests lie at the intersection of 3D vision and generative models, including feed-forward 3D reconstruction, sparse-view reconstruction, 3D Gaussian Splatting, 3D world models, controllable visual generation, and resolution extrapolation in diffusion models.",
      zh: "研究方向主要围绕三维视觉与生成模型，包括前馈式三维重建、稀疏视角重建、3D Gaussian Splatting、三维世界模型、可控视觉生成，以及扩散模型的分辨率外推。",
    },
    "keyword.3dReconstruction": { en: "3D Reconstruction", zh: "三维重建" },
    "keyword.3dFoundation": { en: "3D Foundation Models", zh: "三维基础模型" },
    "keyword.worldModels": { en: "3D World Models", zh: "三维世界模型" },
    "keyword.controllable": { en: "Controllable Generation", zh: "可控生成" },
    "keyword.diffusion": { en: "Diffusion Models", zh: "扩散模型" },
    "home.internship.title": { en: "Internship Experience", zh: "实习经历" },
    "home.internship.note": { en: "Industry Research", zh: "产业研究经历" },
    "home.internship.inspatio.meta": {
      en: "Current · InSpatio",
      zh: "当前 · 影溯科技 (InSpatio)",
    },
    "home.internship.inspatio.title": {
      en: "Spatial Intelligence and 3D World Model Intern",
      zh: "空间智能与三维世界模型实习",
    },
    "home.internship.inspatio.body": {
      en: "Participating in TOPOS1.0 and 3DGS-based 3D world model development; researching panoramic-image feed-forward 3D reconstruction and scene-level 3D VAE latent-space design.",
      zh: "参与 TOPOS1.0 与基于 3DGS 的三维世界模型研发；正在研究基于全景图像的前馈三维重建模型与场景级三维 VAE 隐空间设计。",
    },
    "home.internship.horizon.meta": {
      en: "Previous · Horizon Robotics Talent Program",
      zh: "此前 · 地平线机器人人才计划",
    },
    "home.internship.horizon.title": {
      en: "3D Reconstruction Foundation Model Intern",
      zh: "三维重建基础模型实习",
    },
    "home.internship.horizon.body": {
      en: "Worked on 3D reconstruction foundation models, with a focus on feed-forward multi-view geometry reasoning, cross-view communication, and high-resolution reconstruction.",
      zh: "参与三维重建基础模型相关工作，围绕前馈式多视角几何推理、跨视角通信与高分辨率重建开展模型设计与实验。",
    },
    "home.research.title": { en: "Research Overview", zh: "研究内容" },
    "home.research.note": { en: "Research Overview", zh: "研究主线" },
    "home.research.3d.title": { en: "3D Reconstruction and Foundation Models", zh: "三维重建与基础模型" },
    "home.research.3d.body": {
      en: "My work studies sparse-view and feed-forward 3D reconstruction, including multi-view geometry, cross-view reasoning, NeRF/3DGS scene representations, and high-resolution reconstruction. Related internship work covers cross-view communication, sparse attention, and high-resolution architecture design for 3D reconstruction foundation models.",
      zh: "围绕稀疏视角与前馈式三维重建，研究多视图几何、跨视角推理、NeRF/3DGS 场景表征与高分辨率重建等问题；相关工作包括三维重建基础模型中的跨视角通信、稀疏注意力与高分辨率结构设计。",
    },
    "home.research.world.title": { en: "3D World Models and Spatial Intelligence", zh: "三维世界模型与空间智能" },
    "home.research.world.body": {
      en: "At InSpatio, I participate in TOPOS1.0 and 3DGS-based 3D world model construction. My current research includes panoramic-image feed-forward 3D reconstruction and scene-level 3D VAE latent-space design.",
      zh: "参与 TOPOS1.0 与基于 3DGS 的三维世界模型搭建，当前研究基于全景图像的前馈三维重建模型，以及场景级三维 VAE 隐空间设计。",
    },
    "home.research.gen.title": { en: "Controllable Generation and Diffusion Models", zh: "可控生成与扩散模型" },
    "home.research.gen.body": {
      en: "My generative-model work focuses on controllable text-to-image generation, resolution extrapolation, and mechanism analysis, studying positional encodings, attention receptive fields, frequency-aware details, and in-domain adaptation in U-Net/DiT/FLUX-like diffusion and flow models.",
      zh: "围绕可控文生图、分辨率外推与生成机制分析，研究 U-Net/DiT/FLUX-like 扩散与流模型中的位置编码、注意力感受野、频率细节保持与域内生成适配。",
    },

    "publications.title": { en: "Selected Publications", zh: "主要论文" },
    "publications.note": { en: "Published / accepted work", zh: "已发表 / 已接收工作" },
    "publications.summary.position": {
      en: "Analyzes the implicit positional role of convolutional zero padding in high-resolution U-Net diffusion inference and introduces a training-free boundary-complement strategy for resolution extrapolation.",
      zh: "分析卷积零填充在高分辨率 U-Net 扩散推理中的隐式位置作用，并提出无需训练的边界补全策略，用于分辨率外推。",
    },
    "publications.summary.resdit": {
      en: "Studies high-resolution extrapolation in Diffusion Transformers and FLUX-like models, focusing on positional encoding, attention receptive fields, and frequency-aware detail preservation.",
      zh: "研究扩散 Transformer 与 FLUX-like 模型中的高分辨率外推问题，重点分析位置编码、注意力感受野与频率感知细节保持。",
    },
    "publications.summary.image": {
      en: "Proposes image-only domain adaptation for large-scale text-to-image diffusion models through guidance-decoupled prior preservation, reducing damage to the original controllability of the model.",
      zh: "提出面向大规模文生图扩散模型的仅图像领域适配方法，通过引导解耦的先验保持减少对原模型可控能力的破坏。",
    },
    "publications.summary.lifting": {
      en: "Introduces pose-guided attention and adaptive feature selection to use image cues for 2D-to-3D human pose lifting while suppressing background overfitting.",
      zh: "提出姿态引导注意力与自适应特征选择，利用图像线索改进 2D-to-3D 人体姿态提升，并抑制背景过拟合。",
    },
    "publications.summary.omegas": {
      en: "Extracts object-level meshes from large 3D scenes by combining 2D Gaussian Splatting segmentation with personalized diffusion priors for occluded and invisible regions.",
      zh: "结合 2D Gaussian Splatting 分割与个性化扩散先验，从大规模三维场景中提取物体级 mesh，并补全遮挡或不可见区域。",
    },
    "publications.summary.survey": {
      en: "A systematic survey of controllable text-to-image diffusion, covering condition injection, structural control, editing control, personalization, and the evolution from prompt-level to spatial- and instance-level control.",
      zh: "系统综述可控文生图扩散模型，覆盖条件注入、结构控制、编辑控制、个性化生成，以及从提示词级控制到空间级、实例级控制的演进。",
    },
    "publications.paper": { en: "Paper", zh: "论文" },
    "publications.survey": { en: "Survey", zh: "综述" },

    "cv.general.title": { en: "General Information", zh: "基本信息" },
    "cv.general.name": { en: "Full Name: Feng Zhou", zh: "姓名：周峰" },
    "cv.general.email": { en: "Email: zhoufeng@bupt.edu.cn", zh: "邮箱：zhoufeng@bupt.edu.cn" },
    "cv.general.location": { en: "Location: Beijing, China", zh: "所在地：中国北京" },
    "cv.education.title": { en: "Education", zh: "教育经历" },
    "cv.education.phd": {
      en: "Ph.D. student in Control Science and Engineering, Beijing University of Posts and Telecommunications, expected June 2027",
      zh: "北京邮电大学控制科学与工程博士研究生，预计 2027 年 6 月毕业",
    },
    "cv.education.advisor": {
      en: "Advisor: Prof. Jianqin Yin, BUPT-COST Lab",
      zh: "导师：尹建芹教授，BUPT-COST Lab",
    },
    "cv.education.direction": {
      en: "Research direction: controllable visual generation and visual understanding of the 3D world",
      zh: "研究方向：可控视觉生成与三维世界视觉理解",
    },
    "cv.education.beng": {
      en: "B.Eng. in Internet of Things Engineering, Beijing University of Posts and Telecommunications, June 2022",
      zh: "北京邮电大学物联网工程专业工学学士，2022 年 6 月毕业",
    },
    "cv.education.gpa": { en: "GPA: 3.7 / 4.0", zh: "GPA：3.7 / 4.0" },
    "cv.education.directPhd": {
      en: "Recommended for direct Ph.D. admission",
      zh: "获推荐免试直接攻读博士学位资格",
    },
    "cv.research.title": { en: "Research Interests", zh: "研究兴趣" },
    "cv.research.1": {
      en: "Feed-forward 3D reconstruction, 3D world models, and 3D reconstruction foundation models",
      zh: "前馈式三维重建、三维世界模型与三维重建基础模型",
    },
    "cv.research.2": {
      en: "Sparse-view reconstruction, NeRF/3DGS scene representations, and 3D scene understanding",
      zh: "稀疏视角重建、NeRF/3DGS 场景表征与三维场景理解",
    },
    "cv.research.3": {
      en: "Diffusion models, controllable visual generation, and resolution extrapolation",
      zh: "扩散模型、可控视觉生成与分辨率外推",
    },
    "cv.research.4": {
      en: "AI-assisted research and engineering workflows for model development and experimentation",
      zh: "面向模型开发与实验验证的 AI 辅助科研与工程工作流",
    },
    "cv.experience.title": { en: "Experience", zh: "实习经历" },
    "cv.experience.inspatio.heading": {
      en: "<strong>Jun 2026 - Present: Spatial Intelligence and 3D World Model Intern, InSpatio</strong>",
      zh: "<strong>2026 年 6 月至今：影溯科技 (InSpatio) 空间智能与三维世界模型实习</strong>",
    },
    "cv.experience.inspatio.1": {
      en: "Participate in TOPOS1.0 development and 3DGS-based 3D world model construction.",
      zh: "参与 TOPOS1.0 研发，参与基于 3DGS 的三维世界模型搭建。",
    },
    "cv.experience.inspatio.2": {
      en: "Research panoramic-image feed-forward 3D reconstruction and scene-level 3D VAE latent-space design.",
      zh: "正在研究基于全景图像的前馈三维重建模型，以及场景级别的三维 VAE 隐空间设计。",
    },
    "cv.experience.horizon.heading": {
      en: "<strong>Nov 2025 - May 2026: Talent Program Intern, Horizon Robotics</strong>",
      zh: "<strong>2025 年 11 月 - 2026 年 5 月：地平线机器人人才计划实习生</strong>",
    },
    "cv.experience.horizon.1": {
      en: "Work on 3D reconstruction foundation models, with a focus on feed-forward multi-view geometry reasoning, cross-view communication, and high-resolution reconstruction.",
      zh: "参与三维重建基础模型研发，重点关注前馈式多视角几何推理、跨视角通信与高分辨率重建。",
    },
    "cv.experience.horizon.2": {
      en: "Developed ATSR, a block-level top-k sparse attention design that reduces redundant cross-view communication and improves Pose AUC@30 from 0.879 to 0.891 with 8.45x acceleration under 300-view evaluation.",
      zh: "开发 ATSR，通过块级 top-k 稀疏注意力减少冗余跨视角通信；在 300-view 评测下，将 Pose AUC@30 从 0.879 提升至 0.891，并获得 8.45x 加速。",
    },
    "cv.experience.horizon.3": {
      en: "Developed GeoWeave, a selective cross-view communication mechanism for robust pose and point-cloud reconstruction under weak overlap and distracting views.",
      zh: "开发 GeoWeave，构建选择性跨视角通信机制，在弱重叠与干扰视角下提升位姿与点云重建稳定性。",
    },
    "cv.experience.horizon.4": {
      en: "Explored Hybrid-VGGT, a high-resolution architecture with a low-resolution global backbone and a high-resolution HDE branch for depth and point-cloud quality.",
      zh: "探索 Hybrid-VGGT，以低分辨率全局骨干网络配合高分辨率 HDE 分支，提升深度与点云质量。",
    },
    "cv.experience.horizon.5": {
      en: "Built mixed training data from 17 public datasets, unified evaluation scripts, business-data adaptation pipelines, and synthetic-data support for detailed object reconstruction.",
      zh: "构建来自 17 个公开数据集的混合训练数据、统一评测脚本、业务数据适配流程，以及面向精细物体重建的合成数据支持。",
    },
    "cv.researchExperience.title": { en: "Research Experience", zh: "科研经历" },
    "cv.researchExperience.3d.heading": {
      en: "<strong>3D Vision: Reconstruction and Scene Understanding</strong>",
      zh: "<strong>三维视觉：重建与场景理解</strong>",
    },
    "cv.researchExperience.3d.1": {
      en: "Sparse-view 3D reconstruction: study initialization quality as a dominant factor for sparse-view 3DGS; proposed low-frequency-aware SfM, 3DGS self-initialization, and point-cloud consistency filtering.",
      zh: "稀疏视角三维重建：研究初始化质量对稀疏视角 3DGS 的关键影响，提出低频感知 SfM、3DGS 自初始化与点云一致性过滤。",
    },
    "cv.researchExperience.3d.2": {
      en: "Object-level understanding in large 3D scenes: proposed Gaussian-segmentation guided object extraction and personalized diffusion priors for occluded or invisible regions.",
      zh: "大场景物体级理解：提出高斯分割引导的物体提取方法，并结合个性化扩散先验补全遮挡或不可见区域。",
    },
    "cv.researchExperience.3d.3": {
      en: "Monocular 3D human pose estimation: designed pose-guided attention and adaptive feature selection to leverage image cues for 2D-to-3D pose lifting.",
      zh: "单目三维人体姿态估计：设计姿态引导注意力与自适应特征选择，利用图像线索改进 2D-to-3D 姿态提升。",
    },
    "cv.researchExperience.gen.heading": {
      en: "<strong>Controllable Visual Generation and Resolution Extrapolation</strong>",
      zh: "<strong>可控视觉生成与分辨率外推</strong>",
    },
    "cv.researchExperience.gen.1": {
      en: "Analyzed implicit positional encoding in U-Net diffusion and proposed a training-free strategy for high-resolution image generation.",
      zh: "分析 U-Net 扩散模型中的隐式位置编码，并提出无需训练的高分辨率图像生成策略。",
    },
    "cv.researchExperience.gen.2": {
      en: "Studied resolution scalability in Diffusion Transformers and FLUX-like models through attention receptive fields and frequency-aware detail preservation.",
      zh: "从注意力感受野与频率感知细节保持角度，研究扩散 Transformer 与 FLUX-like 模型的分辨率可扩展性。",
    },
    "cv.researchExperience.gen.3": {
      en: "Worked on image-only in-domain generation adaptation, controllable-generation evaluation, and a survey of text-to-image diffusion control.",
      zh: "开展仅图像驱动的域内生成适配、可控生成评测与文生图扩散控制综述研究。",
    },
    "cv.publications.title": { en: "Selected Publications", zh: "主要论文" },
    "cv.skills.title": { en: "Technical Scope", zh: "技术能力" },
    "cv.skills.1": {
      en: "Computer vision foundations: image formation, matching, optical flow, detection, segmentation, and pose estimation.",
      zh: "计算机视觉基础：理解成像建模、特征匹配、光流、检测、分割与姿态估计等基础问题。",
    },
    "cv.skills.2": {
      en: "3D vision: camera models, epipolar geometry, triangulation, PnP/BA, SfM/MVS/SLAM, NeRF, 3DGS, and feed-forward 3D foundation models.",
      zh: "三维视觉：掌握相机模型、对极几何、三角化、PnP/BA、SfM/MVS/SLAM、NeRF、3DGS 与前馈式三维基础模型。",
    },
    "cv.skills.3": {
      en: "Generative modeling: DDPM/DDIM, SDE/ODE samplers, CFG, rectified flow / flow matching, latent diffusion, and Transformer-based diffusion / flow models.",
      zh: "生成模型：理解 DDPM/DDIM、SDE/ODE 采样器、CFG、rectified flow / flow matching、latent diffusion，以及基于 Transformer 的扩散/流模型架构。",
    },
    "cv.skills.4": {
      en: "General-purpose AI workflow: LLM/VLM applications, RAG/Agent patterns, tool use, and AI-assisted research and engineering workflows.",
      zh: "通用 AI 工作流：了解 LLM/VLM 应用、RAG/Agent 范式、工具调用，以及 AI 辅助科研与工程工作流的搭建方式。",
    },
  };

  function getPageId() {
    return document.body.dataset.page || "about";
  }

  function normalizeLang(value) {
    return value === "en" || value === "zh" ? value : DEFAULT_LANG;
  }

  function getStoredLang() {
    try {
      return normalizeLang(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_LANG;
    }
  }

  function setStoredLang(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures; the toggle still works for the current page.
    }
  }

  function applyLanguage(lang) {
    const pageId = getPageId();
    const meta = pageMeta[pageId]?.[lang];

    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.body.dataset.lang = lang;

    if (meta) {
      document.title = meta.title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute("content", meta.description);
    }

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      const value = translations[key]?.[lang];
      if (value !== undefined) {
        element.innerHTML = value;
      }
    });

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", lang === "zh" ? "true" : "false");
      button.setAttribute(
        "aria-label",
        lang === "zh" ? "Switch to English" : "切换到中文"
      );
    });
  }

  function initLanguageToggle() {
    let currentLang = getStoredLang();
    applyLanguage(currentLang);

    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        currentLang = currentLang === "zh" ? "en" : "zh";
        setStoredLang(currentLang);
        applyLanguage(currentLang);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLanguageToggle);
  } else {
    initLanguageToggle();
  }
})();
