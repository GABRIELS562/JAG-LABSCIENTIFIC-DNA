#!/usr/bin/env python3
"""
Create proper binary ABIF (.fsa) files for OSIRIS
Based on Applied Biosystems ABIF file format specification
"""

import struct
import sys
import os
from datetime import datetime
import numpy as np

class ABIFWriter:
    def __init__(self):
        self.directory = []
        self.data_sections = {}
        self.header_size = 128  # Standard ABIF header size
        
    def add_tag(self, name, element_type, element_size, num_elements, data_size, data_offset, data_handle=0):
        """Add a tag to the ABIF directory"""
        entry = struct.pack('>4sIIIII', 
                          name.encode('ascii')[:4].ljust(4, b'\x00'),
                          element_type,
                          element_size, 
                          num_elements,
                          data_size,
                          data_offset)
        self.directory.append(entry)
        
    def create_fsa_file(self, output_path, sample_name="SAMPLE001"):
        """Create a proper ABIF FSA file"""
        
        # Create sample electropherogram data (8000 data points per channel)
        data_points = 8000
        channels = 5  # FAM, VIC, NED, PET, LIZ
        
        # Generate realistic baseline + peaks for each channel
        channel_data = []
        for ch in range(channels):
            data = np.random.normal(50, 10, data_points).astype(np.int16)  # Baseline ~50 RFU
            data = np.clip(data, 0, 32767)  # Keep within int16 range
            
            # Add some peaks for demonstration
            if ch < 4:  # STR channels
                for peak_pos in [1000, 2000, 3000, 4000, 5000, 6000]:
                    peak_start = peak_pos - 20
                    peak_end = peak_pos + 20
                    if peak_start >= 0 and peak_end < data_points:
                        # Gaussian peak
                        x = np.arange(peak_start, peak_end)
                        peak = 200 + np.random.randint(0, 300)  # Peak height 200-500
                        gaussian = peak * np.exp(-0.5 * ((x - peak_pos) / 5) ** 2)
                        data[peak_start:peak_end] = np.maximum(data[peak_start:peak_end], gaussian.astype(np.int16))
            else:  # LIZ ladder channel
                # GeneScan LIZ 500 ladder peaks
                ladder_positions = [350, 500, 750, 1000, 1390, 1500, 1600, 2000, 2500, 3000, 3400, 3500, 4000, 4500, 4900, 5000]
                for pos in ladder_positions:
                    if pos < data_points:
                        peak_start = max(0, pos - 15)
                        peak_end = min(data_points, pos + 15)
                        x = np.arange(peak_start, peak_end)
                        peak = 300 + np.random.randint(0, 200)  # Ladder peak height
                        gaussian = peak * np.exp(-0.5 * ((x - pos) / 4) ** 2)
                        data[peak_start:peak_end] = np.maximum(data[peak_start:peak_end], gaussian.astype(np.int16))
            
            channel_data.append(data)
        
        # Start building the file
        with open(output_path, 'wb') as f:
            # Write temporary header (will be updated later)
            f.write(b'\x00' * 128)
            
            current_offset = 128
            
            # Write directory placeholder
            dir_offset = current_offset
            f.write(b'\x00' * 1000)  # Reserve space for directory
            current_offset += 1000
            
            # Write data sections and build directory
            self.directory = []
            
            # Sample name
            sample_bytes = sample_name.encode('ascii')
            f.seek(current_offset)
            f.write(sample_bytes)
            self.add_tag('SMPL', 19, 1, len(sample_bytes), len(sample_bytes), current_offset)  # pString
            current_offset += len(sample_bytes)
            
            # Machine name
            machine = b'ABI_3130'
            f.seek(current_offset)
            f.write(machine)
            self.add_tag('MCHN', 19, 1, len(machine), len(machine), current_offset)
            current_offset += len(machine)
            
            # Model
            model = b'3130'
            f.seek(current_offset)
            f.write(model)
            self.add_tag('MODL', 19, 1, len(model), len(model), current_offset)
            current_offset += len(model)
            
            # Run date/time
            now = datetime.now()
            run_date = struct.pack('>H', now.year) + struct.pack('>BB', now.month, now.day)
            f.seek(current_offset)
            f.write(run_date)
            self.add_tag('RUND', 2, 4, 1, 4, current_offset)  # Date
            current_offset += 4
            
            run_time = struct.pack('>BBB', now.hour, now.minute, now.second) + b'\x00'
            f.seek(current_offset)
            f.write(run_time)
            self.add_tag('RUNT', 3, 4, 1, 4, current_offset)  # Time
            current_offset += 4
            
            # Number of data points
            f.seek(current_offset)
            f.write(struct.pack('>I', data_points))
            self.add_tag('SCAN', 4, 4, 1, 4, current_offset)  # Long
            current_offset += 4
            
            # Lane number
            f.seek(current_offset)
            f.write(struct.pack('>H', 1))
            self.add_tag('LANE', 5, 2, 1, 2, current_offset)  # Short
            current_offset += 2
            
            # Dye names
            dyes = ['FAM', 'VIC', 'NED', 'PET', 'LIZ']
            for i, dye in enumerate(dyes):
                dye_bytes = dye.encode('ascii')
                f.seek(current_offset)
                f.write(dye_bytes)
                self.add_tag(f'DyeN', 19, 1, len(dye_bytes), len(dye_bytes), current_offset)
                current_offset += len(dye_bytes)
            
            # Channel data
            for ch in range(channels):
                data_bytes = channel_data[ch].tobytes()
                f.seek(current_offset)
                f.write(data_bytes)
                self.add_tag(f'DATA', 4, 2, len(channel_data[ch]), len(data_bytes), current_offset)  # Short array
                current_offset += len(data_bytes)
            
            # Write directory
            f.seek(dir_offset)
            for entry in self.directory:
                f.write(entry)
            
            # Write header
            f.seek(0)
            header = struct.pack('>4sHHIIII',
                               b'ABIF',          # Signature
                               0x0101,          # Version
                               dir_offset,      # Directory offset
                               len(self.directory),  # Number of directory entries
                               0,               # Unused
                               0,               # Unused
                               0)               # Unused
            f.write(header)
            f.write(b'\x00' * (128 - len(header)))  # Pad header to 128 bytes
            
        print(f"Created binary ABIF FSA file: {output_path}")
        return True

def main():
    writer = ABIFWriter()
    
    # Create sample files
    samples = [
        ("IDENTIFILER_CHILD_001", "Child sample for paternity testing"),
        ("IDENTIFILER_FATHER_001", "Father sample for paternity testing"), 
        ("IDENTIFILER_MOTHER_001", "Mother sample for paternity testing")
    ]
    
    output_dir = "/Users/user/LABSCIENTIFIC-LIMS/identifiler_plus_samples"
    
    for sample_name, description in samples:
        output_path = os.path.join(output_dir, f"{sample_name}.fsa")
        print(f"Creating {description}...")
        writer.create_fsa_file(output_path, sample_name)
        
        # Verify file is binary
        with open(output_path, 'rb') as f:
            header = f.read(4)
            if header == b'ABIF':
                print(f"✅ Valid ABIF header: {output_path}")
            else:
                print(f"❌ Invalid header: {output_path}")
    
    print("\n🎉 Binary FSA files created successfully!")
    print("These files should now be recognized by OSIRIS.")

if __name__ == "__main__":
    main()