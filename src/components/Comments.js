import styled from "styled-components";
import { PropTypes } from "prop-types";
import Comment from "./Comment";
import { gql, useMutation } from "@apollo/client";
import { useForm } from "react-hook-form";
import useUser from "../hooks/useUser";
import { forwardRef, useImperativeHandle } from "react";

const CommentContainer = styled.div``;

const TotalComment = styled.div``;

const CommentBox = styled.input``;

export const CREATE_COMMENT_MUTATION = gql`
  mutation createComment($payload: String!, $pictureId: Int!, $commentId: Int) {
    createComment(
      payload: $payload
      pictureId: $pictureId
      commentId: $commentId
    ) {
      ok
      id
      error
    }
  }
`;

const Comments = forwardRef(({ pictureId, comments, totalComment }, ref) => {
  useImperativeHandle(ref, () => ({
    focusCommentInput() {
      setFocus("payload");
    }
  }));
  const { data: userData } = useUser();
  const { register, handleSubmit, getValues, setValue, setFocus } = useForm();
  const createCommentUpdate = (cache, result) => {
    const { payload } = getValues();
    setValue("payload", "");
    const {
      data: {
        createComment: { ok, id }
      }
    } = result;
    if (ok && userData?.me) {
      const newComment = {
        __typename: "Comment",
        createdAt: Date.now() + "",
        id,
        isMine: true,
        payload,
        author: { ...userData.me }
      };
      const newCacheComment = cache.writeFragment({
        data: newComment,
        fragment: gql`
          fragment comment on Comment {
            id
            createdAt
            isMine
            payload
            author {
              username
              avatar
            }
          }
        `
      });
      cache.modify({
        id: `Picture:${pictureId}`,
        fields: {
          comments(prev) {
            return [...prev, newCacheComment];
          },
          totalComment(prev) {
            return prev + 1;
          }
        }
      });
    }
  };
  const [createCommentMutation, { loading }] = useMutation(
    CREATE_COMMENT_MUTATION,
    { update: createCommentUpdate }
  );
  const onVaild = data => {
    const { payload } = data;
    if (loading) {
      return;
    }
    createCommentMutation({
      variables: {
        payload,
        pictureId
      }
    });
  };
  return (
    <CommentContainer>
      <TotalComment>댓글 개수: {totalComment}</TotalComment>
      {comments?.map(comment => (
        <Comment
          key={comment.id}
          commentId={comment.id}
          pictureId={pictureId}
          payload={comment.payload}
          author={comment.author}
          isMine={comment.isMine}
          isLiked={comment.isLiked}
          nestedComments={comment.nestedComments}
        />
      ))}
      <form onSubmit={handleSubmit(onVaild)}>
        <CommentBox
          placeholder="댓글 작성하기"
          {...register("payload", { required: true })}
        />
      </form>
    </CommentContainer>
  );
});

Comments.propTypes = {
  pictureId: PropTypes.number.isRequired,
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      payload: PropTypes.string.isRequired,
      author: PropTypes.shape({
        avatar: PropTypes.string,
        username: PropTypes.string.isRequired
      }),
      isMine: PropTypes.bool.isRequired,
      createdAt: PropTypes.string.isRequired
    })
  )
};

export default Comments;
