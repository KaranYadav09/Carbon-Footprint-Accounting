import os
from advanced_bill_pipeline import AdvancedBillPipeline

class AdvancedOCRPipeline:
    def __init__(self, poppler_path=None):
        self.pipeline = AdvancedBillPipeline(poppler_path=poppler_path)

    def process_bill(self, filepath):
        """
        Legacy wrapper for the new unified pipeline.
        Returns the raw OCR text or structured data depending on caller.
        """
        # For legacy compatibility, we might need just the text or the whole result
        # Our new services.py calls the new pipeline directly, so this is mostly for safety.
        image = self.pipeline._convert_to_image(filepath)
        return self.pipeline.run_paddle_ocr(image)
