#!/usr/bin/env python3
"""
Comprehensive product tag generator for bicycle/e-bike shop CSV
Generates 5-10 relevant tags per product based on type, brand, features, size, color, and use case
"""

import csv
import re
from typing import List, Set

def extract_brand(title: str) -> str:
    """Extract brand name from product title"""
    title_lower = title.lower()
    
    # Common brands found in the data
    brands = {
        'cube': 'cube',
        'raymon': 'raymon',
        'ns bikes': 'ns-bikes',
        'ns-bikes': 'ns-bikes',
        'mondraker': 'mondraker',
        'orca': 'orca',
        'yuba': 'yuba',
        'tern': 'tern',
        'riese': 'riese-muller',
        'müller': 'riese-muller',
        'bosch': 'bosch',
        'shimano': 'shimano',
        'sram': 'sram',
        'fox': 'fox',
        'schwalbe': 'schwalbe',
        'vittoria': 'vittoria',
        'cube ': 'cube',  # with space to avoid partial matches
        'ejoy': 'ejoy',
        'delite': 'riese-muller',
        'charger': 'riese-muller',
        'nevo': 'riese-muller',
        'load': 'riese-muller',
        'multitinker': 'riese-muller',
        'packster': 'riese-muller',
        'roadster': 'riese-muller',
        'culture': 'riese-muller',
        'cruiser': 'riese-muller',
        'carrie': 'riese-muller',
        'hsd': 'tern',
        'gsd': 'tern',
        'abus': 'abus',
        'ergotec': 'ergotec',
        'acid': 'acid',
        'trelock': 'trelock',
        'thule': 'thule',
        'magura': 'magura',
        'rema tip top': 'rema-tip-top',
        'sks': 'sks',
        'xlc': 'xlc',
        'tsg': 'tsg',
        'evoc': 'evoc',
    }
    
    for brand_key, brand_tag in brands.items():
        if brand_key in title_lower:
            return brand_tag
    
    return ''

def extract_colors(title: str) -> List[str]:
    """Extract color information from title"""
    title_lower = title.lower()
    colors = []
    
    color_map = {
        'black': 'black',
        'white': 'white',
        'red': 'red',
        'blue': 'blue',
        'green': 'green',
        'yellow': 'yellow',
        'orange': 'orange',
        'pink': 'pink',
        'purple': 'purple',
        'violet': 'purple',
        'grey': 'grey',
        'gray': 'grey',
        'brown': 'brown',
        'silver': 'silver',
        'gold': 'gold',
        'copper': 'copper',
        'bronze': 'bronze',
        'turquoise': 'turquoise',
        'lime': 'lime',
        'olive': 'olive',
        'navy': 'navy',
        'petrol': 'petrol',
        'titanium': 'titanium',
        'carbon': 'carbon',
        'matt': 'matte',
        'gloss': 'glossy',
    }
    
    for color_key, color_tag in color_map.items():
        if color_key in title_lower and color_tag not in colors:
            colors.append(color_tag)
    
    return colors

def extract_sizes(title: str) -> List[str]:
    """Extract size information from title"""
    sizes = []
    
    # Wheel sizes
    wheel_patterns = [
        r'(\d+)"', r'(\d+)″', r'(\d+)\s*inch', r'(\d+)\s*zoll',
        r'29er', r'29', r'27\.5', r'26', r'24', r'20', r'18', r'16', r'14', r'12'
    ]
    
    for pattern in wheel_patterns:
        matches = re.findall(pattern, title, re.IGNORECASE)
        for match in matches:
            if match.isdigit():
                size = int(match)
                if 12 <= size <= 29:
                    sizes.append(f'{size}-inch')
            elif pattern == '29er' and '29er' in title.lower():
                sizes.append('29-inch')
            elif pattern == '29' and '29' in title:
                sizes.append('29-inch')
            elif pattern == '27\.5' and '27.5' in title:
                sizes.append('27-5-inch')
    
    # Frame sizes
    frame_patterns = [
        r'\b(xs|s|m|l|xl|xxl)\b',
        r'(\d{2,3})\s*cm',
    ]
    
    for pattern in frame_patterns:
        matches = re.findall(pattern, title, re.IGNORECASE)
        for match in matches:
            if match.lower() in ['xs', 's', 'm', 'l', 'xl', 'xxl']:
                sizes.append(f'size-{match.lower()}')
            elif match.isdigit():
                size = int(match)
                if 40 <= size <= 65:  # Typical frame sizes in cm
                    sizes.append(f'{size}cm')
    
    return sizes

def extract_battery_specs(title: str) -> List[str]:
    """Extract battery specifications"""
    specs = []
    
    # Battery capacity
    battery_patterns = [
        r'(\d+)wh',
        r'(\d+)\s*wh',
    ]
    
    for pattern in battery_patterns:
        matches = re.findall(pattern, title, re.IGNORECASE)
        for match in matches:
            capacity = int(match)
            if 200 <= capacity <= 1000:  # Reasonable e-bike battery range
                specs.append(f'{capacity}wh')
    
    # Speed specifications
    if '45km' in title.lower() or '45 km' in title.lower():
        specs.append('45kmh')
        specs.append('s-pedelec')
    
    return specs

def categorize_product_type(product_type: str, title: str) -> List[str]:
    """Categorize product based on type and title"""
    tags = []
    type_lower = product_type.lower()
    title_lower = title.lower()
    
    # E-bikes
    if 'e-bike' in type_lower or 'e-mtb' in type_lower:
        tags.append('electric')
        tags.append('e-bike')
        
        if 'cargo' in type_lower:
            tags.extend(['cargo-bike', 'family-bike'])
        elif 'mtb' in type_lower or 'mountain' in type_lower:
            tags.append('mountain-bike')
            if 'fully' in type_lower or 'full' in type_lower:
                tags.append('fully')
                tags.append('full-suspension')
            elif 'hardtail' in type_lower:
                tags.append('hardtail')
        elif 'city' in type_lower or 'trekking' in type_lower or 'tour' in type_lower:
            tags.extend(['city-bike', 'trekking-bike'])
        elif 'road' in type_lower:
            tags.append('road-bike')
        elif 'foldable' in type_lower or 'pieghevole' in type_lower:
            tags.extend(['foldable', 'compact'])
    
    # Traditional bikes
    elif 'bikes' in type_lower or 'velos' in type_lower:
        tags.append('bike')
        
        if 'kids' in type_lower or 'kid' in type_lower:
            tags.append('kids-bike')
            # Extract age/size info for kids bikes
            if '14' in title_lower:
                tags.append('14-inch')
            elif '16' in title_lower:
                tags.append('16-inch')
            elif '18' in title_lower:
                tags.append('18-inch')
            elif '20' in title_lower:
                tags.append('20-inch')
            elif '24' in title_lower:
                tags.append('24-inch')
        elif 'mountain' in type_lower or 'mtb' in type_lower:
            tags.append('mountain-bike')
            if 'fully' in type_lower:
                tags.extend(['fully', 'full-suspension'])
        elif 'road' in type_lower:
            tags.append('road-bike')
        elif 'city' in type_lower or 'trekking' in type_lower:
            tags.extend(['city-bike', 'trekking-bike'])
        elif 'dirt' in type_lower:
            tags.extend(['dirt-bike', 'bmx'])
        elif 'foldable' in type_lower:
            tags.extend(['foldable', 'compact'])
    
    # Parts and accessories
    elif 'teile' in type_lower or 'parts' in type_lower:
        tags.append('parts')
        
        if 'bremse' in type_lower or 'brake' in type_lower:
            tags.extend(['brakes', 'brake-parts'])
        elif 'räder' in type_lower or 'wheel' in type_lower:
            tags.extend(['wheels', 'tires'])
        elif 'getriebe' in type_lower or 'gear' in type_lower:
            tags.extend(['drivetrain', 'gears'])
        elif 'lenker' in type_lower or 'handlebar' in type_lower:
            tags.extend(['handlebars', 'steering'])
        elif 'sattel' in type_lower or 'seat' in type_lower:
            tags.append('saddle')
        elif 'pedale' in type_lower or 'pedal' in type_lower:
            tags.append('pedals')
        elif 'bosch' in type_lower:
            tags.extend(['bosch', 'motor-parts'])
    
    elif 'zubehör' in type_lower or 'accessories' in type_lower:
        tags.append('accessories')
        
        if 'helm' in type_lower or 'helmet' in type_lower:
            tags.extend(['helmet', 'safety'])
        elif 'korb' in type_lower or 'basket' in type_lower:
            tags.append('basket')
        elif 'tasche' in type_lower or 'bag' in type_lower:
            tags.extend(['bag', 'panniers'])
        elif 'schloss' in type_lower or 'lock' in type_lower:
            tags.extend(['lock', 'security'])
        elif 'licht' in type_lower or 'light' in type_lower:
            tags.extend(['lights', 'lighting'])
        elif 'schutzblech' in type_lower or 'fender' in type_lower:
            tags.extend(['fenders', 'mudguards'])
        elif 'gepäckträger' in type_lower or 'rack' in type_lower:
            tags.extend(['rack', 'carrier'])
        elif 'ständer' in type_lower or 'stand' in type_lower:
            tags.append('kickstand')
        elif 'bekleidung' in type_lower or 'clothing' in type_lower:
            tags.extend(['clothing', 'apparel'])
        elif 'pumpe' in type_lower or 'pump' in type_lower:
            tags.append('pump')
        elif 'tool' in type_lower or 'werkzeug' in type_lower:
            tags.append('tools')
    
    return list(set(tags))  # Remove duplicates

def extract_features(title: str) -> List[str]:
    """Extract special features from title"""
    features = []
    title_lower = title.lower()
    
    feature_map = {
        'test': 'demo',
        'demo': 'demo',
        'okkasion': 'used',
        'occasion': 'used',
        'easy entry': 'step-through',
        'step-through': 'step-through',
        'performance': 'performance',
        'touring': 'touring',
        'cargo': 'cargo',
        'foldable': 'foldable',
        'folding': 'foldable',
        'comfort': 'comfort',
        'sport': 'sport',
        'urban': 'urban',
        'hybrid': 'hybrid',
        'allroad': 'gravel',
        'gravel': 'gravel',
        'tubeless': 'tubeless',
        'disc': 'disc-brakes',
        'hydraulic': 'hydraulic',
        'carbon': 'carbon',
        'aluminum': 'aluminum',
        'steel': 'steel',
        'suspension': 'suspension',
    }
    
    for feature_key, feature_tag in feature_map.items():
        if feature_key in title_lower and feature_tag not in features:
            features.append(feature_tag)
    
    return features

def generate_product_tags(title: str, product_type: str) -> List[str]:
    """Generate comprehensive tags for a product"""
    tags = set()
    
    # Add brand
    brand = extract_brand(title)
    if brand:
        tags.add(brand)
    
    # Add product type categories
    type_tags = categorize_product_type(product_type, title)
    tags.update(type_tags)
    
    # Add colors
    colors = extract_colors(title)
    tags.update(colors)
    
    # Add sizes
    sizes = extract_sizes(title)
    tags.update(sizes)
    
    # Add battery specs
    battery_specs = extract_battery_specs(title)
    tags.update(battery_specs)
    
    # Add features
    features = extract_features(title)
    tags.update(features)
    
    # Additional specific tags based on title content
    title_lower = title.lower()
    
    # Use case tags
    if any(word in title_lower for word in ['commut', 'city', 'urban']):
        tags.add('commuting')
    if any(word in title_lower for word in ['mountain', 'trail', 'mtb']):
        tags.add('mountain-biking')
    if any(word in title_lower for word in ['road', 'racing', 'speed']):
        tags.add('road-cycling')
    if any(word in title_lower for word in ['cargo', 'family', 'load']):
        tags.add('family-cycling')
    if any(word in title_lower for word in ['kids', 'children', 'junior']):
        tags.add('kids')
    
    # Convert to sorted list and limit to reasonable number
    tag_list = sorted(list(tags))
    
    # Ensure we have at least some core tags
    if not tag_list:
        if 'e-bike' in product_type.lower():
            tag_list = ['electric', 'e-bike']
        elif 'bike' in product_type.lower():
            tag_list = ['bike']
        elif 'teil' in product_type.lower() or 'part' in product_type.lower():
            tag_list = ['parts']
        elif 'zubehör' in product_type.lower() or 'accessor' in product_type.lower():
            tag_list = ['accessories']
    
    # Limit to max 10 tags to avoid clutter
    return tag_list[:10]

def process_csv(input_file: str, output_file: str):
    """Process the entire CSV file and generate tags"""
    processed_count = 0
    
    with open(input_file, 'r', encoding='utf-8-sig') as infile:
        # Read CSV with proper handling of the BOM
        content = infile.read()
        if content.startswith('\ufeff'):
            content = content[1:]  # Remove BOM
        
        lines = content.strip().split('\n')
        reader = csv.reader(lines)
        
        # Get header
        header = next(reader)
        
        # Prepare output
        with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.writer(outfile)
            writer.writerow(header)  # Write header
            
            for row in reader:
                if len(row) >= 7:  # Ensure we have all columns
                    # Generate tags
                    title = row[3]  # Title column
                    product_type = row[4]  # Type column
                    
                    tags = generate_product_tags(title, product_type)
                    
                    # Update the Tags column (index 5)
                    row[5] = ', '.join(tags)
                    
                    # Write updated row
                    writer.writerow(row)
                    processed_count += 1
                    
                    if processed_count % 100 == 0:
                        print(f"Processed {processed_count} products...")

def main():
    input_file = "/mnt/c/Users/zcega/Downloads/Export_2025-08-27_095227.csv"
    output_file = "/mnt/c/Users/zcega/Downloads/Export_2025-08-27_095227_with_tags.csv"
    
    print("Starting tag generation process...")
    process_csv(input_file, output_file)
    print(f"Tag generation complete! Output saved to: {output_file}")

if __name__ == "__main__":
    main()