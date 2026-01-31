"""
FocusFlow - Request/response validation with Marshmallow.
ActivitySchema: raw_input length, source type.
GoalSchema: target_value > 0, valid Enums.
"""

from marshmallow import Schema, fields, validate, ValidationError

from models import CategoryEnum, TimeframeEnum, GoalTypeEnum, SourceEnum


# Valid enum value sets for validation
CATEGORY_VALUES = [c.value for c in CategoryEnum]
TIMEFRAME_VALUES = [t.value for t in TimeframeEnum]
GOAL_TYPE_VALUES = [g.value for g in GoalTypeEnum]
SOURCE_VALUES = [s.value for s in SourceEnum]

# Limits
RAW_INPUT_MAX_LENGTH = 1000
ACTIVITY_NAME_MAX_LENGTH = 255
GOAL_TITLE_MAX_LENGTH = 255


class ActivityLogSchema(Schema):
    """Validate activity log input (e.g. log_activity, update_activity)."""
    text = fields.String(required=False, load_default="")
    raw_input = fields.String(required=False, validate=validate.Length(max=RAW_INPUT_MAX_LENGTH))
    activity_name = fields.String(required=False, validate=validate.Length(max=ACTIVITY_NAME_MAX_LENGTH))
    duration_minutes = fields.Integer(required=False, validate=validate.Range(min=1, max=1440))
    category = fields.String(required=False, validate=validate.OneOf(CATEGORY_VALUES))
    source = fields.String(required=False, validate=validate.OneOf(SOURCE_VALUES), load_default=SourceEnum.MANUAL.value)

    def get_cleaned_text(self, data):
        """Get 'text' or 'raw_input' for log_activity, stripped and length-checked."""
        text = (data.get("text") or data.get("raw_input") or "").strip()
        if len(text) > RAW_INPUT_MAX_LENGTH:
            raise ValidationError({"text": [f"Must be at most {RAW_INPUT_MAX_LENGTH} characters."]})
        return text


class ActivityUpdateSchema(Schema):
    """Validate activity update (PUT) payload."""
    activity_name = fields.String(required=False, validate=validate.Length(max=ACTIVITY_NAME_MAX_LENGTH))
    duration_minutes = fields.Integer(required=False, validate=validate.Range(min=1, max=1440))
    category = fields.String(required=False, validate=validate.OneOf(CATEGORY_VALUES))


class GoalCreateSchema(Schema):
    """Validate goal create: target_value > 0, valid Enums."""
    title = fields.String(required=False, allow_none=True, validate=validate.Length(max=GOAL_TITLE_MAX_LENGTH))
    category = fields.String(required=False, allow_none=True, validate=validate.OneOf(CATEGORY_VALUES))
    target_value = fields.Integer(required=True, validate=validate.Range(min=1, max=999))
    timeframe = fields.String(required=True, validate=validate.OneOf(TIMEFRAME_VALUES))
    goal_type = fields.String(required=False, load_default=GoalTypeEnum.TARGET.value, validate=validate.OneOf(GOAL_TYPE_VALUES))


# Singleton instances for use in routes
activity_log_schema = ActivityLogSchema()
activity_update_schema = ActivityUpdateSchema()
goal_schema = GoalCreateSchema()
