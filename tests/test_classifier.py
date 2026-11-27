from engine.classifier.engineering import is_engineering_job
from engine.classifier.experience import extract_experience
from engine.classifier.location import LocationNormalizer
from engine.classifier.roles import RoleClassifier
from engine.classifier.skills import SkillExtractor
from engine.models import RoleCategory, WorkMode


def test_engineering_segregation():
    # Non-tech should be rejected
    assert not is_engineering_job("Sales Executive", "Closing enterprise sales deals")
    assert not is_engineering_job("HR Recruiter", "Talent acquisition for business roles")
    assert not is_engineering_job("Legal Counsel", "Drafting contracts and IP agreements")
    assert not is_engineering_job("Customer Support Associate", "Answering inbound calls")

    # Tech roles should pass
    assert is_engineering_job("Software Development Engineer", "Writing distributed microservices")
    assert is_engineering_job("Backend Engineer - Go", "Building scalable APIs")
    assert is_engineering_job("DevOps Architect", "Managing Kubernetes clusters on AWS")
    assert is_engineering_job("Machine Learning Engineer", "Training LLMs and PyTorch models")


def test_role_classification():
    clf = RoleClassifier()
    role, _label = clf.classify("Senior Backend Engineer - Python")
    assert role == RoleCategory.BACKEND

    role, _label = clf.classify("Frontend Developer (React/TypeScript)")
    assert role == RoleCategory.FRONTEND

    role, _label = clf.classify("DevOps / Cloud Engineer")
    assert role == RoleCategory.DEVOPS_SRE

    role, _label = clf.classify("AI Research Scientist (GenAI)")
    assert role == RoleCategory.AI_ML


def test_experience_extraction():
    min_y, max_y, level = extract_experience("Software Engineer", "Requires 2 to 4 years of experience with Java")
    assert min_y == 2
    assert max_y == 4

    min_y, max_y, level = extract_experience("Graduate Software Engineer Trainee", "")
    assert min_y == 0
    assert level == "Fresher / 0-1 yr"

    min_y, max_y, level = extract_experience("Staff Platform Architect", "")
    assert min_y == 5
    assert level == "5+ yrs"


def test_skills_extraction():
    extractor = SkillExtractor()
    skills = extractor.extract("Looking for a developer with strong Python, Docker, Kubernetes, and PostgreSQL experience.")
    assert "Python" in skills
    assert "Docker" in skills
    assert "Kubernetes" in skills
    assert "PostgreSQL" in skills


def test_location_and_mode_normalization():
    norm = LocationNormalizer()
    city, is_in, mode = norm.normalize("Bengaluru, India", "Backend Engineer", "")
    assert city == "Bengaluru"
    assert is_in is True
    assert mode == WorkMode.ONSITE

    city, is_in, mode = norm.normalize("Remote - India", "Full Stack Developer", "Work from home anywhere")
    assert is_in is True
    assert mode == WorkMode.REMOTE

    # Null raw_location edge case resilience
    city, is_in, mode = norm.normalize(None, "Software Engineer", "Located in Delhi NCR")
    assert city == "Delhi NCR"
    assert is_in is True

    city, is_in, mode = norm.normalize(None, "Software Engineer", "")
    assert city is None
    assert is_in is False


def test_sanitize_text_helper():
    from engine.adapters.base import sanitize_text
    dirty = "&amp;lt;div&amp;gt;&lt;p&gt;About the Role: We need a Python &amp;amp; Go dev&lt;/p&gt;&lt;/div&gt;"
    cleaned = sanitize_text(dirty, strip_boilerplate=True)
    assert "&amp;" not in cleaned
    assert "&lt;" not in cleaned
    assert "<div" not in cleaned
    assert "<p" not in cleaned
    assert "We need a Python & Go dev" in cleaned
