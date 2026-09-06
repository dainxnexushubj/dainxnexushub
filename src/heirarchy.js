// D.A.I.N.X NEXUS
// RANGER COMMAND HIERARCHY
// Version 1.0

const RangerHierarchy = {
  system: "D.A.I.N.X NEXUS",

  levels: {
    0: {
      designation: "SUPREME NEXUS COMMANDER",
      member: "Daniel Williamston",
      role: "SYSTEM OWNER",
      authority: "FINAL AUTHORITY",
      permissions: [
        "SYSTEM_CONTROL",
        "FINAL_APPROVAL",
        "FINAL_OVERRIDE",
        "STRATEGIC_DIRECTION"
      ]
    },

    1: {
      designation: "NEXUS COMMAND",
      authority: "SYSTEM-WIDE COORDINATION",
      permissions: [
        "COORDINATE_BRANCHES",
        "ASSIGN_OBJECTIVES",
        "MAINTAIN_ALIGNMENT",
        "ESCALATE_CONFLICTS"
      ]
    },

    2: {
      designation: "BRANCH COMMAND",
      branches: {
        RANGER: {
          designation: "DAIN X RANGER",
          mission:
            "Intelligence, research, missions, productivity, project execution, fault detection, timelines, and memory."
        },

        MERIDA: {
          designation: "MERIDA",
          mission:
            "Discover opportunities, create value, build products, and drive sustainable growth."
        }
      }
    },

    3: {
      designation: "SPECIALIST SYSTEMS",
      systems: [
        "MISSION_INTELLIGENCE",
        "RESEARCH_INTELLIGENCE",
        "PROJECT_MANAGEMENT",
        "PRODUCTIVITY_ANALYSIS",
        "FAULT_DETECTION",
        "TIMELINE_MANAGEMENT",
        "MEMORY"
      ]
    },

    4: {
      designation: "OPERATIONS / AGENTS",
      agents: [
        "RESEARCH_AGENT",
        "PLANNING_AGENT",
        "EXECUTION_AGENT",
        "MONITORING_AGENT",
        "MEMORY_AGENT",
        "VERIFICATION_AGENT"
      ]
    },

    5: {
      designation: "TASKS",
      authority: "ACTION LEVEL",
      execution_flow: [
        "MISSION",
        "OBJECTIVE",
        "TASK",
        "ACTION",
        "RESULT"
      ]
    }
  },

  getLevel(level) {
    return this.levels[level] || null;
  },

  getBranch(name) {
    const branches = this.levels[2].branches;
    return branches[name] || null;
  },

  isCommander(name) {
    return name === this.levels[0].member;
  },

  canCommand(actorLevel, targetLevel) {
    return actorLevel <= targetLevel;
  },

  getAuthority(name) {
    if (name === "Daniel Williamston") {
      return "FINAL AUTHORITY";
    }

    return "DEFINED SYSTEM AUTHORITY";
  }
};

export default RangerHierarchy;
