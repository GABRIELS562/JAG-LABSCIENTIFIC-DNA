"""
Test data generator for JAG-LABSCIENTIFIC-DNA
"""
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from faker import Faker

fake = Faker()


class TestDataGenerator:
    """Generate realistic test data for DNA testing lab"""

    # PowerPlex ESX 17 loci with realistic allele ranges
    STR_LOCI = {
        "D3S1358": {"range": (12, 19), "repeat": 4},
        "vWA": {"range": (14, 21), "repeat": 4},
        "D16S539": {"range": (8, 15), "repeat": 4},
        "CSF1PO": {"range": (10, 15), "repeat": 4},
        "TPOX": {"range": (6, 13), "repeat": 4},
        "D8S1179": {"range": (10, 17), "repeat": 4},
        "D21S11": {"range": (24, 33), "repeat": 4},
        "D18S51": {"range": (10, 20), "repeat": 4},
        "D2S441": {"range": (8, 16), "repeat": 4},
        "D19S433": {"range": (12, 17), "repeat": 4},
        "TH01": {"range": (6, 10), "repeat": 4},
        "FGA": {"range": (18, 27), "repeat": 4},
        "D5S818": {"range": (7, 16), "repeat": 4},
        "D13S317": {"range": (8, 15), "repeat": 4},
        "D7S820": {"range": (6, 15), "repeat": 4},
        "SE33": {"range": (12, 20), "repeat": 4},
        "Amelogenin": {"alleles": ["X", "Y"]},
    }

    WORKFLOW_STATUSES = [
        "sample_collected",
        "extraction_ready",
        "extraction_in_progress",
        "extraction_completed",
        "quantification_ready",
        "quantification_completed",
        "pcr_ready",
        "pcr_batched",
        "pcr_completed",
        "electro_ready",
        "electro_batched",
        "electro_completed",
        "analysis_ready",
        "analysis_completed",
        "report_ready",
        "report_sent",
    ]

    SAMPLE_TYPES = ["buccal_swab", "blood", "saliva", "tissue", "hair"]

    RELATIONS = ["Child", "Alleged Father", "Mother", "Sibling", "Other"]

    TEST_PURPOSES = [
        "Paternity Testing",
        "Kinship Analysis",
        "Identification",
        "Immigration",
        "Criminal Investigation",
    ]

    CASE_PRIORITIES = ["routine", "urgent", "stat", "court_date"]

    CASE_STATUSES = ["submitted", "in_progress", "review", "completed", "on_hold", "cancelled"]

    def generate_lab_number(self, prefix: str = "LAB") -> str:
        """Generate unique lab number"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = "".join(random.choices(string.ascii_uppercase, k=3))
        return f"{prefix}-{timestamp}-{random_suffix}"

    def generate_case_number(self, prefix: str = "PAT") -> str:
        """Generate case number"""
        year = datetime.now().year
        seq = random.randint(1, 9999)
        return f"{prefix}-{year}-{seq:04d}"

    def generate_sample(self, **overrides) -> Dict[str, Any]:
        """Generate sample data"""
        data = {
            "lab_number": self.generate_lab_number(),
            "name": fake.first_name(),
            "surname": fake.last_name(),
            "relation": random.choice(self.RELATIONS),
            "case_number": self.generate_case_number(),
            "collection_date": datetime.now().isoformat(),
            "sample_type": random.choice(self.SAMPLE_TYPES),
        }
        data.update(overrides)
        return data

    def generate_case(self, **overrides) -> Dict[str, Any]:
        """Generate case data"""
        data = {
            "testPurpose": random.choice(self.TEST_PURPOSES),
            "priority": random.choice(self.CASE_PRIORITIES),
            "requesterName": fake.name(),
            "requesterOrganization": fake.company(),
            "requesterContact": fake.email(),
            "courtCaseNumber": f"COURT-{random.randint(1000, 9999)}",
            "courtDate": (datetime.now() + timedelta(days=random.randint(7, 60))).isoformat(),
            "specialInstructions": fake.sentence(),
        }
        data.update(overrides)
        return data

    def generate_str_allele(self, locus: str) -> tuple:
        """Generate a realistic STR allele pair for a locus"""
        locus_info = self.STR_LOCI.get(locus, {"range": (10, 15)})

        if locus == "Amelogenin":
            # Return sex chromosomes
            sex = random.choice(["male", "female"])
            return ("X", "Y") if sex == "male" else ("X", "X")

        min_val, max_val = locus_info["range"]
        allele1 = random.randint(min_val, max_val)
        allele2 = random.randint(min_val, max_val)
        return (min(allele1, allele2), max(allele1, allele2))

    def generate_str_profile(self, sex: str = "male") -> Dict[str, Any]:
        """Generate a complete STR profile"""
        profile = {}
        for locus in self.STR_LOCI:
            if locus == "Amelogenin":
                profile[locus] = ("X", "Y") if sex == "male" else ("X", "X")
            else:
                profile[locus] = self.generate_str_allele(locus)
        return profile

    def generate_paternity_trio(self) -> Dict[str, Any]:
        """Generate child, mother, and father profiles for paternity testing"""
        # Generate mother profile
        mother_profile = self.generate_str_profile(sex="female")

        # Generate father profile
        father_profile = self.generate_str_profile(sex="male")

        # Generate child profile (inheriting from parents)
        child_profile = {}
        for locus in self.STR_LOCI:
            if locus == "Amelogenin":
                # Child gets X from mother, X or Y from father
                child_sex = random.choice(["male", "female"])
                child_profile[locus] = ("X", "Y") if child_sex == "male" else ("X", "X")
            else:
                # Child inherits one allele from each parent
                maternal_allele = random.choice(mother_profile[locus])
                paternal_allele = random.choice(father_profile[locus])
                child_profile[locus] = (
                    min(maternal_allele, paternal_allele),
                    max(maternal_allele, paternal_allele)
                )

        return {
            "child": child_profile,
            "mother": mother_profile,
            "alleged_father": father_profile,
            "is_true_father": True,
        }

    def generate_exclusion_trio(self) -> Dict[str, Any]:
        """Generate profiles where alleged father is NOT the biological father"""
        # Generate independent profiles
        child_profile = self.generate_str_profile(sex=random.choice(["male", "female"]))
        mother_profile = self.generate_str_profile(sex="female")
        non_father_profile = self.generate_str_profile(sex="male")

        return {
            "child": child_profile,
            "mother": mother_profile,
            "alleged_father": non_father_profile,
            "is_true_father": False,
        }

    def generate_inventory_item(self, **overrides) -> Dict[str, Any]:
        """Generate inventory item data"""
        categories = ["Reagent", "Consumable", "Equipment", "Kit"]
        data = {
            "item_code": f"INV-{random.randint(1000, 9999)}",
            "name": f"{fake.word().capitalize()} {random.choice(['Reagent', 'Kit', 'Buffer'])}",
            "category_id": random.randint(1, len(categories)),
            "supplier_id": random.randint(1, 5),
            "unit_of_measure": random.choice(["mL", "uL", "units", "pieces"]),
            "minimum_stock_level": random.randint(5, 50),
            "reorder_point": random.randint(10, 30),
        }
        data.update(overrides)
        return data

    def generate_capa(self, **overrides) -> Dict[str, Any]:
        """Generate CAPA (Corrective/Preventive Action) data"""
        capa_types = ["corrective", "preventive"]
        priorities = ["low", "medium", "high", "critical"]

        data = {
            "title": f"CAPA-{random.randint(1000, 9999)}: {fake.sentence(nb_words=5)}",
            "description": fake.paragraph(),
            "type": random.choice(capa_types),
            "priority": random.choice(priorities),
            "responsible_person": fake.name(),
            "due_date": (datetime.now() + timedelta(days=random.randint(7, 30))).isoformat(),
        }
        data.update(overrides)
        return data

    def generate_batch_samples(self, count: int = 3) -> List[Dict[str, Any]]:
        """Generate a batch of samples for a paternity case"""
        case_number = self.generate_case_number()
        surname = fake.last_name()

        samples = []
        for relation in ["Child", "Mother", "Alleged Father"][:count]:
            samples.append(self.generate_sample(
                case_number=case_number,
                surname=surname,
                relation=relation,
            ))
        return samples

    def generate_report_request(self, case_id: int = 1, **overrides) -> Dict[str, Any]:
        """Generate report request data"""
        data = {
            "caseId": case_id,
            "caseData": {
                "caseNumber": self.generate_case_number(),
                "testDate": datetime.now().isoformat(),
                "testPurpose": "Paternity Testing",
            },
            "results": {
                "cpi": random.uniform(1000, 1000000),
                "probability": random.uniform(0.99, 0.9999),
                "conclusion": "INCLUDED",
            },
            "options": {
                "includeElectropherogram": True,
                "includeStatistics": True,
                "includeChainOfCustody": True,
            },
        }
        data.update(overrides)
        return data
