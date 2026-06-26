import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, create_engine, or_, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://notesync:notesync@localhost:5432/notesync"
)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
passwords = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user = relationship("User", back_populates="notes")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class NoteIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    content: str = ""
    is_deleted: bool = False


class TagIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr

    model_config = {"from_attributes": True}


class NoteOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    user_id: int

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


Db = Annotated[Session, Depends(get_db)]


def make_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Db) -> User:
    try:
        user_id = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"]
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


CurrentUser = Annotated[User, Depends(current_user)]

app = FastAPI(title="NoteSync API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Db) -> TokenOut:
    exists = db.scalar(select(User).where(or_(User.email == data.email, User.username == data.username)))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "User already exists")
    user = User(
        username=data.username,
        email=str(data.email).lower(),
        password_hash=passwords.hash(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=make_token(user.id), user=user)


@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Db) -> TokenOut:
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    if not user or not passwords.verify(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return TokenOut(access_token=make_token(user.id), user=user)


@app.get("/auth/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@app.get("/notes", response_model=list[NoteOut])
def notes(user: CurrentUser, db: Db) -> list[Note]:
    return list(db.scalars(select(Note).where(Note.user_id == user.id).order_by(Note.updated_at.desc())))


@app.get("/notes/{note_id}", response_model=NoteOut)
def note(note_id: int, user: CurrentUser, db: Db) -> Note:
    found = db.scalar(select(Note).where(Note.id == note_id, Note.user_id == user.id))
    if not found:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    return found


@app.post("/notes", response_model=NoteOut, status_code=201)
def create_note(data: NoteIn, user: CurrentUser, db: Db) -> Note:
    new_note = Note(title=data.title, content=data.content, is_deleted=data.is_deleted, user_id=user.id)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note


@app.put("/notes/{note_id}", response_model=NoteOut)
def update_note(note_id: int, data: NoteIn, user: CurrentUser, db: Db) -> Note:
    found = note(note_id, user, db)
    found.title = data.title
    found.content = data.content
    found.is_deleted = data.is_deleted
    found.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(found)
    return found


@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, user: CurrentUser, db: Db) -> None:
    found = note(note_id, user, db)
    found.is_deleted = True
    found.updated_at = datetime.utcnow()
    db.commit()


@app.get("/tags", response_model=list[TagOut])
def tags(_: CurrentUser, db: Db) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name)))


@app.post("/tags", response_model=TagOut, status_code=201)
def create_tag(data: TagIn, _: CurrentUser, db: Db) -> Tag:
    tag = Tag(name=data.name.strip().lower())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag
