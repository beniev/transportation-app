"""
Core utility functions.
"""
import math
from typing import Optional, Tuple


def haversine_distance(
    lat1: float, lng1: float,
    lat2: float, lng2: float
) -> float:
    """
    Calculate the great-circle distance between two points
    on Earth using the Haversine formula.

    Args:
        lat1, lng1: Latitude and longitude of point 1 (in degrees)
        lat2, lng2: Latitude and longitude of point 2 (in degrees)

    Returns:
        Distance in kilometers
    """
    R = 6371.0  # Earth's radius in km

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (
        math.sin(dlat / 2) ** 2 +
        math.cos(lat1_rad) * math.cos(lat2_rad) *
        math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def extract_coordinates(coord_dict: dict) -> Optional[Tuple[float, float]]:
    """
    Extract lat/lng from a coordinates dict.

    Args:
        coord_dict: Dict with 'lat' and 'lng' keys

    Returns:
        Tuple of (lat, lng) floats, or None if invalid
    """
    if not coord_dict:
        return None
    lat = coord_dict.get('lat')
    lng = coord_dict.get('lng')
    if lat is not None and lng is not None:
        try:
            return (float(lat), float(lng))
        except (TypeError, ValueError):
            return None
    return None
